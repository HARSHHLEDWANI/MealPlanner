export interface User {
    id: string;
    email?: string;
    phone?: string;
  }
  
  export interface Recipe {
    id: string;
    title: string;
    description?: string;
    ingredients: string[];
    instructions: string[];
    prepTime: string;
    servings: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    imageUrl: string;
    saved?: boolean;
    user_generated?: boolean;
    created_at?: string;
    // Enhanced fields from OpenAI
    alternatives?: string[];
    tips?: string[];
    serving_suggestions?: string[];
    storage_instructions?: string;
    nutritional_info?: string;
    enhanced_at?: string;
  }
  
  export interface Ingredient {
    id: string;
    name: string;
    amount: string;
    unit: string;
  }
  
  export interface MealPlan {
    id: string;
    userId: string;
    weekStart: string;
    days: MealPlanDay[];
  }
  
  export interface MealPlanDay {
    date: string;
    meals: {
      breakfast?: Recipe | null;
      lunch?: Recipe | null;
      dinner?: Recipe | null;
      snacks?: Recipe[];
    };
  }
  
  export interface GroceryList {
    id: string;
    userId: string;
    title: string;
    dateCreated: string;
    items: GroceryItem[];
  }
  
  export interface GroceryItem {
    id: string;
    name: string;
    amount: string;
    unit: string;
    checked: boolean;
    category?: string;
  }
  
  export type AuthState = 'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';