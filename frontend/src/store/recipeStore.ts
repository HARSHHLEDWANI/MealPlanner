import { create } from 'zustand';
import { Recipe } from '../types';
import { supabase } from '../lib/supabase';

interface RecipeState {
  recipes: Recipe[];
  savedRecipes: Recipe[];
  searchResults: Recipe[];
  loading: boolean;
  error: string | null;
  fetchRecipes: () => Promise<void>;
  fetchSavedRecipes: () => Promise<void>;
  searchRecipes: (query: string) => Promise<void>;
  searchByIngredients: (ingredients: string[]) => Promise<void>;
  saveRecipe: (recipeId: string) => Promise<void>;
  unsaveRecipe: (recipeId: string) => Promise<void>;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  savedRecipes: [],
  searchResults: [],
  loading: false,
  error: null,

  fetchRecipes: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*');

      if (error) throw error;
      
      set({ recipes: data as Recipe[], loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch recipes', 
        loading: false 
      });
    }
  },

  fetchSavedRecipes: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('saved_recipes')
        .select('recipe_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;
      
      // Get the full recipe details for each saved recipe
      if (data.length > 0) {
        const recipeIds = data.map(item => item.recipe_id);
        const { data: recipesData, error: recipesError } = await supabase
          .from('recipes')
          .select('*')
          .in('id', recipeIds);
          
        if (recipesError) throw recipesError;
        
        set({ 
          savedRecipes: (recipesData as Recipe[]).map(recipe => ({ ...recipe, saved: true })), 
          loading: false 
        });
      } else {
        set({ savedRecipes: [], loading: false });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch saved recipes', 
        loading: false 
      });
    }
  },

  searchRecipes: async (query: string) => {
    set({ loading: true });
    try {
      // In a real app, you might use a more sophisticated search
      // For now, we'll just filter the recipes we have
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .textSearch('title', query, { 
          type: 'websearch',
          config: 'english' 
        });

      if (error) throw error;
      
      set({ searchResults: data as Recipe[], loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to search recipes', 
        loading: false,
        searchResults: []
      });
    }
  },

  searchByIngredients: async (ingredients: string[]) => {
    set({ loading: true });
    try {
      // In the real app, you would use an AI service here
      // For now, we'll just simulate with a basic filter
      const { data, error } = await supabase
        .from('recipes')
        .select('*');

      if (error) throw error;
      
      // Simple simulation of ingredient matching
      const filteredRecipes = (data as Recipe[]).filter(recipe => {
        const recipeIngredients = recipe.ingredients.map(i => i.name.toLowerCase());
        return ingredients.some(ing => 
          recipeIngredients.some(ri => ri.includes(ing.toLowerCase()))
        );
      });
      
      set({ searchResults: filteredRecipes, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to search by ingredients', 
        loading: false 
      });
    }
  },

  saveRecipe: async (recipeId: string) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      const { error } = await supabase
        .from('saved_recipes')
        .insert({ user_id: userId, recipe_id: recipeId });

      if (error) throw error;
      
      // Update the local state
      const { recipes, savedRecipes } = get();
      const recipe = recipes.find(r => r.id === recipeId);
      
      if (recipe) {
        set({ 
          savedRecipes: [...savedRecipes, { ...recipe, saved: true }] 
        });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to save recipe' 
      });
    }
  },

  unsaveRecipe: async (recipeId: string) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      const { error } = await supabase
        .from('saved_recipes')
        .delete()
        .match({ user_id: userId, recipe_id: recipeId });

      if (error) throw error;
      
      // Update the local state
      const { savedRecipes } = get();
      set({ 
        savedRecipes: savedRecipes.filter(recipe => recipe.id !== recipeId) 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to unsave recipe' 
      });
    }
  }
}));