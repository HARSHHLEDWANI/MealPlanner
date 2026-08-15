/**
 * Canonical application types.
 *
 * There were previously two competing Recipe definitions: this file (camelCase)
 * and a sibling `src/types.ts` (snake_case). Node resolves `../types` to the
 * file over the directory, so `types.ts` silently won every import while much
 * of the code was written against this one — roughly half the frontend's build
 * errors came from that single collision.
 *
 * These are now snake_case, mirroring the API responses and the Postgres
 * columns exactly. The alternative was camelCase with a mapping layer at every
 * fetch; matching the wire format means there is nothing to keep in sync.
 */

export type AuthState = 'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

export interface User {
  id: string;
  email?: string;
  phone?: string;
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type ItemCategory = 'Produce' | 'Meat' | 'Dairy' | 'Pantry' | 'Frozen' | 'Other';

/** Day of week as stored on meal_plan_items: 0 = Sunday … 6 = Saturday. */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Recipe {
  id: string;
  title: string;
  description: string;
  /**
   * Free-text lines, e.g. "2 tbsp olive oil".
   *
   * Seeded library recipes historically stored objects here instead. The
   * reconciling migration normalizes them to strings so this type holds for
   * every row.
   */
  ingredients: string[];
  instructions: string[];
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: Difficulty;
  cuisine_type: string;
  dietary_tags: string[];
  image_url?: string;
  calories_per_serving?: number;
  user_generated: boolean;
  created_by?: string;
  created_at: string;

  // Populated by an AI enhancement pass.
  cooking_tips?: string[];
  serving_suggestions?: string[];
  storage_instructions?: string;
  enhanced_at?: string;

  /** Client-side only: whether the signed-in user has saved this recipe. */
  saved?: boolean;
}

export interface UserPreferences {
  id?: string;
  user_id: string;
  dietary_restrictions: string[];
  allergies: string[];
  preferred_cuisines: string[];
  cooking_skill_level: SkillLevel;
  serving_size: number;
  created_at?: string;
  updated_at?: string;
}

export interface MealPlanItem {
  id: string;
  meal_plan_id: string;
  recipe_id: string;
  day_of_week: DayOfWeek;
  meal_type: MealType;
  servings: number;
  created_at?: string;
  /** Joined by the API when a plan is fetched. */
  recipe?: Recipe;
}

export interface MealPlan {
  id: string;
  user_id: string;
  week_start_date: string;
  meals: MealPlanItem[];
  created_at?: string;
  updated_at?: string;
}

export interface ShoppingListItem {
  id: string;
  shopping_list_id: string;
  ingredient: string;
  quantity: number;
  unit: string;
  category: ItemCategory;
  is_checked: boolean;
  created_at?: string;
}

export interface ShoppingList {
  id: string;
  user_id: string;
  meal_plan_id?: string;
  name: string;
  items: ShoppingListItem[];
  created_at?: string;
  updated_at?: string;
}

/** Ingredients identified from a photo by the vision endpoint. */
export interface DetectedIngredient {
  name: string;
  confidence: 'high' | 'medium' | 'low';
  quantity?: string;
}

/** Shape of an error returned by the API's central error handler. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
}
