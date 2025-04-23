import { create } from 'zustand';
import { Recipe } from '../types';
import api from '../lib/api';

interface RecipeState {
  recipes: Recipe[];
  savedRecipes: Recipe[];
  searchResults: Recipe[];
  loading: boolean;
  error: string | null;
  fetchRecipes: () => Promise<void>;
  fetchSavedRecipes: () => Promise<void>;
  searchRecipes: (params: { query: string; cuisine?: string }) => Promise<void>;
  saveRecipe: (recipeId: string) => Promise<void>;
  unsaveRecipe: (recipeId: string) => Promise<void>;
  getRecipeDetails: (recipeId: string) => Promise<Recipe | null>;
  enhanceRecipe: (recipeId: string) => Promise<void>;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  savedRecipes: [],
  searchResults: [],
  loading: false,
  error: null,

  fetchRecipes: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get<Recipe[]>('/api/recipes');
      set({ recipes: response.data, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch recipes', loading: false });
      console.error('Error fetching recipes:', error);
    }
  },

  fetchSavedRecipes: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get<Recipe[]>('/api/recipes/saved');
      set({ savedRecipes: response.data, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch saved recipes', loading: false });
      console.error('Error fetching saved recipes:', error);
    }
  },

  searchRecipes: async ({ query, cuisine }) => {
    set({ loading: true, error: null });
    try {
      // Get the user ID from localStorage or your auth store
      const userId = localStorage.getItem('userId') || 'default'; // Replace with your actual user ID retrieval
      
      // Use the AI endpoint to generate a recipe
      const response = await api.post(`/api/ai/recipe/generate/${userId}`, {
        query,
        cuisine: cuisine || undefined
      });

      // If successful, set the generated recipe as the search result
      set({ 
        searchResults: Array.isArray(response.data) ? response.data : [response.data], 
        loading: false 
      });
    } catch (error) {
      set({ error: 'Failed to search recipes', loading: false });
      console.error('Error searching recipes:', error);
    }
  },

  saveRecipe: async (recipeId: string) => {
    set({ loading: true, error: null });
    try {
      await api.post(`/api/recipes/save/${recipeId}`);
      // Refresh saved recipes after saving
      await get().fetchSavedRecipes();
    } catch (error) {
      set({ error: 'Failed to save recipe', loading: false });
      console.error('Error saving recipe:', error);
    }
  },

  unsaveRecipe: async (recipeId: string) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/api/recipes/save/${recipeId}`);
      // Refresh saved recipes after unsaving
      await get().fetchSavedRecipes();
    } catch (error) {
      set({ error: 'Failed to unsave recipe', loading: false });
      console.error('Error unsaving recipe:', error);
    }
  },

  getRecipeDetails: async (recipeId: string): Promise<Recipe | null> => {
    set({ loading: true, error: null });
    try {
      const response = await api.get<Recipe>(`/api/recipes/${recipeId}`);
      set({ loading: false });
      return response.data;
    } catch (error) {
      set({ error: 'Failed to fetch recipe details', loading: false });
      console.error('Error fetching recipe details:', error);
      return null;
    }
  },

  enhanceRecipe: async (recipeId: string) => {
    set({ loading: true, error: null });
    try {
      const recipe = await get().getRecipeDetails(recipeId);
      if (!recipe) throw new Error('Recipe not found');

      const response = await api.post<Recipe>(`/api/ai/recipe/enhance/${recipeId}`, {
        recipe
      });

      // Update the recipe in the recipes array
      const recipes = get().recipes;
      const index = recipes.findIndex(r => r.id === recipeId);
      if (index !== -1) {
        recipes[index] = response.data;
        set({ recipes: [...recipes] });
      }
      set({ loading: false });
    } catch (error) {
      set({ error: 'Failed to enhance recipe', loading: false });
      console.error('Error enhancing recipe:', error);
    }
  }
}));