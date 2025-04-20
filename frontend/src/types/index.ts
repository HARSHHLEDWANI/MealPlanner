export interface User {
    id: string;
    email?: string;
    phone?: string;
  }
  
  export interface Recipe {
    id: string;
    title: string;
    description: string;
    image_url: string;
    prep_time: number;
    cook_time: number;
    serving_size: number;
    ingredients: Ingredient[];
    instructions: string[];
    tags: string[];
    saved: boolean;
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