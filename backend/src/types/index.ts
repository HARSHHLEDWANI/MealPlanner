export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  cuisine_type: string;
  dietary_tags: string[];
  image_url?: string;
  calories_per_serving?: number;
  user_generated: boolean;
  created_at: string;
  enhanced_at?: string;
}

/**
 * What an AI enhancement pass adds to an existing recipe. Keys are snake_case
 * to match the columns they are written to — the model emits camelCase, and
 * aiService maps between them explicitly.
 */
export interface RecipeEnhancement {
  description: string;
  ingredients: string[];
  instructions: string[];
  cooking_tips: string[];
  serving_suggestions: string[];
  storage_instructions?: string;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  dietary_restrictions: string[];
  allergies: string[];
  preferred_cuisines: string[];
  cooking_skill_level: 'Beginner' | 'Intermediate' | 'Advanced';
  serving_size: number;
  created_at: string;
  updated_at: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  week_start_date: string;
  meals: MealPlanItem[];
  created_at: string;
  updated_at: string;
}

export interface MealPlanItem {
  id: string;
  meal_plan_id: string;
  recipe_id: string;
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 6 = Saturday
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  created_at: string;
}

export interface ShoppingList {
  id: string;
  user_id: string;
  meal_plan_id?: string;
  name: string;
  items: ShoppingListItem[];
  created_at: string;
  updated_at: string;
}

export interface ShoppingListItem {
  id: string;
  shopping_list_id: string;
  ingredient: string;
  quantity: number;
  unit: string;
  category: 'Produce' | 'Meat' | 'Dairy' | 'Pantry' | 'Frozen' | 'Other';
  is_checked: boolean;
  created_at: string;
}

export interface SavedRecipe {
  id: string;
  user_id: string;
  recipe_id: string;
  created_at: string;
} 