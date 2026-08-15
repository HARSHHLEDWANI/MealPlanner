import { create } from 'zustand';
import type { MealPlan, MealPlanItem, MealType, DayOfWeek, Recipe } from '@/types';
import api, { ApiError, errorMessage } from '@/lib/api';

/**
 * Meal plan state.
 *
 * This store previously talked to Supabase directly from the browser, against
 * a `meal_plans.days` JSONB column that no longer exists. That path bypassed
 * the API's authentication, validation, rate limiting and quota enforcement
 * entirely. It now goes through the API like everything else, against the
 * normalized meal_plans + meal_plan_items schema.
 */

interface MealPlanState {
  currentMealPlan: MealPlan | null;
  loading: boolean;
  /** Set while a write is in flight, so the UI can disable controls. */
  saving: boolean;
  error: string | null;
  /** True when the user simply has no plan yet — an empty state, not a failure. */
  isEmpty: boolean;

  fetchCurrentMealPlan: () => Promise<void>;
  createMealPlan: (weekStartDate: string, meals?: MealPlanItem[]) => Promise<MealPlan | null>;
  setMeal: (recipe: Recipe, dayOfWeek: DayOfWeek, mealType: MealType) => Promise<void>;
  removeMeal: (dayOfWeek: DayOfWeek, mealType: MealType) => Promise<void>;
  deleteMealPlan: () => Promise<void>;
  clearError: () => void;
}

/** Sunday of the current week, as YYYY-MM-DD. */
export function currentWeekStart(): string {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  sunday.setHours(0, 0, 0, 0);
  // Build the string from local parts; toISOString() would shift the date by
  // the timezone offset and land on the wrong day west of UTC.
  const month = String(sunday.getMonth() + 1).padStart(2, '0');
  const day = String(sunday.getDate()).padStart(2, '0');
  return `${sunday.getFullYear()}-${month}-${day}`;
}

/** Strips joined and server-owned fields down to what the API accepts. */
function toItemPayload(items: MealPlanItem[]) {
  return items.map((item) => ({
    recipe_id: item.recipe_id,
    day_of_week: item.day_of_week,
    meal_type: item.meal_type,
    servings: item.servings,
  }));
}

export const useMealPlanStore = create<MealPlanState>((set, get) => ({
  currentMealPlan: null,
  loading: false,
  saving: false,
  error: null,
  isEmpty: false,

  clearError: () => set({ error: null }),

  fetchCurrentMealPlan: async () => {
    set({ loading: true, error: null, isEmpty: false });
    try {
      const { data } = await api.get<MealPlan>('/api/meal-plans/current');
      set({ currentMealPlan: data, loading: false, isEmpty: false });
    } catch (error) {
      // No plan yet is the normal state for a new user, not an error to show.
      if (error instanceof ApiError && error.status === 404) {
        set({ currentMealPlan: null, loading: false, isEmpty: true });
        return;
      }
      set({ error: errorMessage(error), loading: false });
    }
  },

  createMealPlan: async (weekStartDate, meals = []) => {
    set({ saving: true, error: null });
    try {
      const { data } = await api.post<MealPlan>('/api/meal-plans', {
        week_start_date: weekStartDate,
        meals: toItemPayload(meals),
      });
      set({ currentMealPlan: data, saving: false, isEmpty: false });
      return data;
    } catch (error) {
      set({ error: errorMessage(error), saving: false });
      return null;
    }
  },

  /**
   * Places a recipe in one slot of the week.
   *
   * The API replaces a plan's items wholesale, so this sends the full set with
   * the target slot swapped. Creates the plan first if there is not one yet.
   */
  setMeal: async (recipe, dayOfWeek, mealType) => {
    let plan = get().currentMealPlan;

    if (!plan) {
      plan = await get().createMealPlan(currentWeekStart());
      if (!plan) return;
    }

    const others = plan.meals.filter(
      (meal) => !(meal.day_of_week === dayOfWeek && meal.meal_type === mealType)
    );

    const nextMeals: MealPlanItem[] = [
      ...others,
      {
        id: `pending-${dayOfWeek}-${mealType}`,
        meal_plan_id: plan.id,
        recipe_id: recipe.id,
        day_of_week: dayOfWeek,
        meal_type: mealType,
        servings: recipe.servings || 1,
        recipe,
      },
    ];

    set({ saving: true, error: null });
    try {
      const { data } = await api.put<MealPlan>(`/api/meal-plans/${plan.id}`, {
        meals: toItemPayload(nextMeals),
      });
      set({ currentMealPlan: data, saving: false });
    } catch (error) {
      set({ error: errorMessage(error), saving: false });
    }
  },

  removeMeal: async (dayOfWeek, mealType) => {
    const plan = get().currentMealPlan;
    if (!plan) return;

    const remaining = plan.meals.filter(
      (meal) => !(meal.day_of_week === dayOfWeek && meal.meal_type === mealType)
    );

    set({ saving: true, error: null });
    try {
      const { data } = await api.put<MealPlan>(`/api/meal-plans/${plan.id}`, {
        meals: toItemPayload(remaining),
      });
      set({ currentMealPlan: data, saving: false });
    } catch (error) {
      set({ error: errorMessage(error), saving: false });
    }
  },

  deleteMealPlan: async () => {
    const plan = get().currentMealPlan;
    if (!plan) return;

    set({ saving: true, error: null });
    try {
      await api.delete(`/api/meal-plans/${plan.id}`);
      set({ currentMealPlan: null, saving: false, isEmpty: true });
    } catch (error) {
      set({ error: errorMessage(error), saving: false });
    }
  },
}));

/** Looks up what is planned for a given slot. */
export function mealAt(
  plan: MealPlan | null,
  dayOfWeek: DayOfWeek,
  mealType: MealType
): MealPlanItem | undefined {
  return plan?.meals.find(
    (meal) => meal.day_of_week === dayOfWeek && meal.meal_type === mealType
  );
}
