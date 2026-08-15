import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Recipe, ShoppingList, MealPlan } from '@/types';

/**
 * Store tests.
 *
 * These cover the layer that was quietly wrong before: the meal-plan and
 * grocery stores used to write to Supabase directly from the browser against
 * a schema the API did not share, bypassing authentication entirely. The
 * assertions check that they now go through the API, and that the optimistic
 * updates roll back when a request fails.
 */

const get = vi.fn();
const post = vi.fn();
const put = vi.fn();
const del = vi.fn();

class MockApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
  get isLimited() {
    return this.status === 429;
  }
}

vi.mock('@/lib/api', () => ({
  default: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    put: (...args: unknown[]) => put(...args),
    delete: (...args: unknown[]) => del(...args),
  },
  ApiError: MockApiError,
  errorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Something went wrong. Please try again.',
}));

const { useRecipeStore } = await import('@/store/recipeStore');
const { useMealPlanStore, currentWeekStart, mealAt } = await import('@/store/mealPlanStore');
const { useGroceryListStore } = await import('@/store/groceryListStore');
const { useUsageStore } = await import('@/store/usageStore');

const recipe = (over: Partial<Recipe> = {}): Recipe => ({
  id: 'r1',
  title: 'Pasta Primavera',
  description: 'Fresh.',
  ingredients: ['2 tbsp olive oil', '1 cup cherry tomatoes'],
  instructions: ['Heat.', 'Toss.'],
  prep_time: 15,
  cook_time: 20,
  servings: 4,
  difficulty: 'Easy',
  cuisine_type: 'Italian',
  dietary_tags: ['vegetarian'],
  user_generated: false,
  created_at: '2026-08-15T00:00:00Z',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  useRecipeStore.setState({
    recipes: [],
    savedRecipes: [],
    searchResults: [],
    loading: false,
    generating: false,
    error: null,
    hasSearched: false,
  });
  useMealPlanStore.setState({
    currentMealPlan: null,
    loading: false,
    saving: false,
    error: null,
    isEmpty: false,
  });
  useGroceryListStore.setState({
    lists: [],
    currentList: null,
    loading: false,
    saving: false,
    error: null,
  });
  useUsageStore.setState({ usage: null, exhausted: false });
});

describe('recipeStore — AI generation flow', () => {
  it('generates a recipe and puts it at the head of the results', async () => {
    const generated = recipe({ id: 'new', title: 'Test Curry', user_generated: true });
    post.mockResolvedValue({ data: generated });
    get.mockResolvedValue({ data: { used: 1, quota: 10, remaining: 9 } });

    const result = await useRecipeStore.getState().generateRecipe('a curry', 'Indian');

    expect(post).toHaveBeenCalledWith('/api/ai/recipe/generate', {
      query: 'a curry',
      cuisine: 'Indian',
    });
    expect(result?.title).toBe('Test Curry');
    expect(useRecipeStore.getState().searchResults[0].id).toBe('new');
    expect(useRecipeStore.getState().generating).toBe(false);
  });

  it('searching does not call the AI endpoint', async () => {
    // Search used to route through AI generation, so every lookup spent a
    // billable call and created a recipe.
    post.mockResolvedValue({ data: [recipe()] });

    await useRecipeStore.getState().searchRecipes('pasta');

    expect(post).toHaveBeenCalledWith('/api/recipes/search', { query: 'pasta' });
    expect(post).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/ai/'),
      expect.anything()
    );
  });

  it('shows a quota message through the usage store, not a red error', async () => {
    post.mockRejectedValue(
      new MockApiError(429, 'QUOTA_EXCEEDED', 'no more today', { used: 10, quota: 10 })
    );

    const result = await useRecipeStore.getState().generateRecipe('x');

    expect(result).toBeNull();
    // Exhaustion is an expected limit with its own UI, not a failure banner.
    expect(useRecipeStore.getState().error).toBeNull();
    expect(useUsageStore.getState().exhausted).toBe(true);
    expect(useUsageStore.getState().usage).toMatchObject({ used: 10, quota: 10, remaining: 0 });
  });

  it('treats an ordinary rate limit differently from a spent quota', async () => {
    post.mockRejectedValue(new MockApiError(429, 'RATE_LIMITED', 'slow down'));

    await useRecipeStore.getState().generateRecipe('x');

    // Same status code, different meaning: this one clears in minutes.
    expect(useRecipeStore.getState().error).toBe('slow down');
    expect(useUsageStore.getState().exhausted).toBe(false);
  });

  it('rolls back the optimistic save when the request fails', async () => {
    useRecipeStore.setState({ recipes: [recipe({ id: 'r1', saved: false })] });
    post.mockRejectedValue(new MockApiError(500, 'INTERNAL_ERROR', 'boom'));
    get.mockResolvedValue({ data: [] });

    await useRecipeStore.getState().saveRecipe('r1');

    // The bookmark must not stay filled in for a save that never happened.
    expect(useRecipeStore.getState().recipes[0].saved).toBe(false);
    expect(useRecipeStore.getState().error).toBe('boom');
  });

  it('ranks ingredient matches by overlap, then by fewest extra ingredients', async () => {
    useRecipeStore.setState({
      recipes: [
        recipe({ id: 'few', ingredients: ['tomato', 'onion', 'garlic', 'basil', 'oil'] }),
        recipe({ id: 'many', ingredients: ['tomato', 'onion'] }),
        recipe({ id: 'one', ingredients: ['tomato', 'cream'] }),
      ],
    });

    await useRecipeStore.getState().searchByIngredients(['tomato', 'onion']);

    const ids = useRecipeStore.getState().searchResults.map((r) => r.id);
    // 'many' and 'few' both match twice; the one needing least else wins.
    expect(ids).toEqual(['many', 'few', 'one']);
  });
});

describe('mealPlanStore', () => {
  it('goes through the API, not Supabase directly', async () => {
    const plan: MealPlan = {
      id: 'p1',
      user_id: 'u1',
      week_start_date: '2026-08-16',
      meals: [],
    };
    get.mockResolvedValue({ data: plan });

    await useMealPlanStore.getState().fetchCurrentMealPlan();

    expect(get).toHaveBeenCalledWith('/api/meal-plans/current');
    expect(useMealPlanStore.getState().currentMealPlan?.id).toBe('p1');
  });

  it('treats a 404 as empty, not as an error', async () => {
    get.mockRejectedValue(new MockApiError(404, 'NOT_FOUND', 'Meal plan not found'));

    await useMealPlanStore.getState().fetchCurrentMealPlan();

    const state = useMealPlanStore.getState();
    // A new user having no plan is a normal state, not something to apologize for.
    expect(state.isEmpty).toBe(true);
    expect(state.error).toBeNull();
    expect(state.currentMealPlan).toBeNull();
  });

  it('replaces the target slot and keeps the rest of the week', async () => {
    const existing: MealPlan = {
      id: 'p1',
      user_id: 'u1',
      week_start_date: '2026-08-16',
      meals: [
        { id: 'm1', meal_plan_id: 'p1', recipe_id: 'a', day_of_week: 1, meal_type: 'lunch', servings: 2 },
        { id: 'm2', meal_plan_id: 'p1', recipe_id: 'b', day_of_week: 2, meal_type: 'dinner', servings: 2 },
      ],
    };
    useMealPlanStore.setState({ currentMealPlan: existing });
    put.mockResolvedValue({ data: { ...existing, meals: [] } });

    await useMealPlanStore.getState().setMeal(recipe({ id: 'c' }), 1, 'lunch');

    const [, body] = put.mock.calls[0];
    const meals = (body as { meals: Array<Record<string, unknown>> }).meals;
    // The Monday lunch is swapped, Tuesday dinner is untouched.
    expect(meals).toHaveLength(2);
    expect(meals).toContainEqual(
      expect.objectContaining({ recipe_id: 'c', day_of_week: 1, meal_type: 'lunch' })
    );
    expect(meals).toContainEqual(expect.objectContaining({ recipe_id: 'b', day_of_week: 2 }));
  });

  it('strips joined recipe objects from the payload it sends', async () => {
    useMealPlanStore.setState({
      currentMealPlan: {
        id: 'p1',
        user_id: 'u1',
        week_start_date: '2026-08-16',
        meals: [
          {
            id: 'm1',
            meal_plan_id: 'p1',
            recipe_id: 'a',
            day_of_week: 1,
            meal_type: 'lunch',
            servings: 2,
            recipe: recipe({ id: 'a' }),
          },
        ],
      },
    });
    put.mockResolvedValue({ data: { id: 'p1', user_id: 'u1', week_start_date: '2026-08-16', meals: [] } });

    await useMealPlanStore.getState().removeMeal(9 as never, 'lunch');

    const [, body] = put.mock.calls[0];
    const meals = (body as { meals: Array<Record<string, unknown>> }).meals;
    // The API rejects unknown keys; a joined recipe would 400 the request.
    expect(meals[0]).not.toHaveProperty('recipe');
    expect(meals[0]).not.toHaveProperty('id');
    expect(Object.keys(meals[0]).sort()).toEqual(
      ['day_of_week', 'meal_type', 'recipe_id', 'servings'].sort()
    );
  });

  it('computes the week start in local time', () => {
    // Building this from toISOString() shifts the date by the timezone offset
    // and lands on the wrong day west of UTC.
    const start = currentWeekStart();
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(`${start}T00:00:00`).getDay()).toBe(0);
  });

  it('finds what is planned in a given slot', () => {
    const plan: MealPlan = {
      id: 'p1',
      user_id: 'u1',
      week_start_date: '2026-08-16',
      meals: [
        { id: 'm1', meal_plan_id: 'p1', recipe_id: 'a', day_of_week: 3, meal_type: 'dinner', servings: 2 },
      ],
    };
    expect(mealAt(plan, 3, 'dinner')?.recipe_id).toBe('a');
    expect(mealAt(plan, 3, 'lunch')).toBeUndefined();
    expect(mealAt(null, 3, 'dinner')).toBeUndefined();
  });
});

describe('groceryListStore', () => {
  const list = (over: Partial<ShoppingList> = {}): ShoppingList => ({
    id: 'l1',
    user_id: 'u1',
    name: 'Weekly',
    items: [
      { id: 'i1', shopping_list_id: 'l1', ingredient: 'tomato', quantity: 2, unit: 'cup', category: 'Produce', is_checked: false },
    ],
    ...over,
  });

  it('fetches through the API', async () => {
    get.mockResolvedValue({ data: [list()] });

    await useGroceryListStore.getState().fetchLists();

    expect(get).toHaveBeenCalledWith('/api/shopping-lists');
    expect(useGroceryListStore.getState().currentList?.id).toBe('l1');
  });

  it('keeps the current selection across a refetch', async () => {
    const second = list({ id: 'l2', name: 'Party' });
    useGroceryListStore.setState({ lists: [list(), second], currentList: second });
    get.mockResolvedValue({ data: [list(), second] });

    await useGroceryListStore.getState().fetchLists();

    // Refreshing must not yank the user back to a different list.
    expect(useGroceryListStore.getState().currentList?.id).toBe('l2');
  });

  it('ticks a checkbox optimistically', async () => {
    useGroceryListStore.setState({ lists: [list()], currentList: list() });
    put.mockResolvedValue({ data: {} });

    const pending = useGroceryListStore.getState().toggleItemChecked('i1');
    // Applied before the request resolves — ticking should feel instant.
    expect(useGroceryListStore.getState().currentList?.items[0].is_checked).toBe(true);
    await pending;

    expect(put).toHaveBeenCalledWith('/api/shopping-lists/l1/items/i1', { is_checked: true });
  });

  it('reverts the checkbox when the update fails', async () => {
    useGroceryListStore.setState({ lists: [list()], currentList: list() });
    put.mockRejectedValue(new MockApiError(500, 'INTERNAL_ERROR', 'nope'));

    await useGroceryListStore.getState().toggleItemChecked('i1');

    // The UI must not claim a change the server rejected.
    expect(useGroceryListStore.getState().currentList?.items[0].is_checked).toBe(false);
    expect(useGroceryListStore.getState().error).toBe('nope');
  });

  it('generates a list from a meal plan via the API', async () => {
    post.mockResolvedValue({ data: list({ id: 'gen' }) });

    const result = await useGroceryListStore.getState().generateFromMealPlan('p1');

    expect(post).toHaveBeenCalledWith('/api/shopping-lists/generate/p1');
    expect(result?.id).toBe('gen');
    expect(useGroceryListStore.getState().currentList?.id).toBe('gen');
  });

  it('selects a neighbouring list after deleting the active one', async () => {
    const other = list({ id: 'l2' });
    useGroceryListStore.setState({ lists: [list(), other], currentList: list() });
    del.mockResolvedValue({ data: {} });

    await useGroceryListStore.getState().deleteList('l1');

    // Deleting the visible list must not leave the page pointing at nothing.
    expect(useGroceryListStore.getState().currentList?.id).toBe('l2');
    expect(useGroceryListStore.getState().lists).toHaveLength(1);
  });
});
