import { create } from 'zustand';
import type { Recipe } from '@/types';
import api, { errorMessage } from '@/lib/api';
import { handleQuotaError, useUsageStore } from '@/store/usageStore';

interface RecipeState {
  recipes: Recipe[];
  savedRecipes: Recipe[];
  searchResults: Recipe[];
  loading: boolean;
  generating: boolean;
  error: string | null;
  /** True once a search has run, so the UI can tell "no results" from "not searched yet". */
  hasSearched: boolean;

  fetchRecipes: () => Promise<void>;
  fetchSavedRecipes: () => Promise<void>;
  searchRecipes: (query: string) => Promise<void>;
  searchByIngredients: (ingredients: string[]) => Promise<void>;
  generateRecipe: (query: string, cuisine?: string) => Promise<Recipe | null>;
  saveRecipe: (recipeId: string) => Promise<void>;
  unsaveRecipe: (recipeId: string) => Promise<void>;
  getRecipeDetails: (recipeId: string) => Promise<Recipe | null>;
  enhanceRecipe: (recipeId: string) => Promise<Recipe | null>;
  clearError: () => void;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  savedRecipes: [],
  searchResults: [],
  loading: false,
  generating: false,
  error: null,
  hasSearched: false,

  clearError: () => set({ error: null }),

  fetchRecipes: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get<Recipe[]>('/api/recipes');
      set({ recipes: data, loading: false });
    } catch (error) {
      set({ error: errorMessage(error), loading: false });
    }
  },

  fetchSavedRecipes: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get<Recipe[]>('/api/recipes/saved');
      set({ savedRecipes: data, loading: false });
    } catch (error) {
      set({ error: errorMessage(error), loading: false });
    }
  },

  /**
   * Searches the existing recipe library.
   *
   * This previously routed to the AI generation endpoint, so every search
   * silently spent a Gemini call and created a new recipe instead of finding
   * one. Generation is now explicit, via generateRecipe.
   */
  searchRecipes: async (query) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post<Recipe[]>('/api/recipes/search', { query });
      set({ searchResults: data, loading: false, hasSearched: true });
    } catch (error) {
      set({ error: errorMessage(error), loading: false, hasSearched: true });
    }
  },

  /**
   * Finds library recipes that use the given ingredients.
   *
   * Used by Leftover Magic and the photo flow. Searches locally over the
   * fetched library rather than spending an AI call — the user can generate
   * explicitly if nothing matches.
   */
  searchByIngredients: async (ingredients) => {
    set({ loading: true, error: null });
    try {
      let library = get().recipes;
      if (library.length === 0) {
        const { data } = await api.get<Recipe[]>('/api/recipes');
        library = data;
        set({ recipes: data });
      }

      const wanted = ingredients.map((item) => item.toLowerCase().trim()).filter(Boolean);

      const scored = library
        .map((recipe) => {
          const haystack = recipe.ingredients.join(' ').toLowerCase();
          const matches = wanted.filter((item) => haystack.includes(item)).length;
          return { recipe, matches };
        })
        .filter((entry) => entry.matches > 0)
        // Most overlap first, then fewest total ingredients — a recipe needing
        // little beyond what the user already has is the more useful suggestion.
        .sort((a, b) =>
          b.matches - a.matches || a.recipe.ingredients.length - b.recipe.ingredients.length
        );

      set({ searchResults: scored.map((entry) => entry.recipe), loading: false, hasSearched: true });
    } catch (error) {
      set({ error: errorMessage(error), loading: false, hasSearched: true });
    }
  },

  generateRecipe: async (query, cuisine) => {
    set({ generating: true, error: null });
    try {
      const { data } = await api.post<Recipe>('/api/ai/recipe/generate', { query, cuisine });
      set({
        searchResults: [data, ...get().searchResults],
        generating: false,
        hasSearched: true,
      });
      // Keep the meter honest without waiting for a page reload.
      useUsageStore.getState().refresh();
      return data;
    } catch (error) {
      // A spent quota is shown by the dedicated quota UI, not as a generic
      // red error banner — it is an expected limit, not a fault.
      const isQuota = handleQuotaError(error);
      set({ error: isQuota ? null : errorMessage(error), generating: false });
      return null;
    }
  },

  saveRecipe: async (recipeId) => {
    // Optimistic, so the bookmark responds immediately.
    const markSaved = (saved: boolean) => (recipe: Recipe) =>
      recipe.id === recipeId ? { ...recipe, saved } : recipe;

    set({
      recipes: get().recipes.map(markSaved(true)),
      searchResults: get().searchResults.map(markSaved(true)),
    });

    try {
      await api.post(`/api/recipes/save/${recipeId}`);
      await get().fetchSavedRecipes();
    } catch (error) {
      set({
        error: errorMessage(error),
        recipes: get().recipes.map(markSaved(false)),
        searchResults: get().searchResults.map(markSaved(false)),
      });
    }
  },

  unsaveRecipe: async (recipeId) => {
    const previouslySaved = get().savedRecipes;

    set({
      savedRecipes: previouslySaved.filter((recipe) => recipe.id !== recipeId),
      recipes: get().recipes.map((recipe) =>
        recipe.id === recipeId ? { ...recipe, saved: false } : recipe
      ),
    });

    try {
      await api.delete(`/api/recipes/save/${recipeId}`);
    } catch (error) {
      set({ error: errorMessage(error), savedRecipes: previouslySaved });
    }
  },

  getRecipeDetails: async (recipeId) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get<Recipe>(`/api/recipes/${recipeId}`);
      set({ loading: false });
      return data;
    } catch (error) {
      set({ error: errorMessage(error), loading: false });
      return null;
    }
  },

  enhanceRecipe: async (recipeId) => {
    set({ generating: true, error: null });
    try {
      const { data } = await api.post<Recipe>(`/api/ai/recipe/enhance/${recipeId}`);
      set({
        recipes: get().recipes.map((recipe) => (recipe.id === recipeId ? data : recipe)),
        generating: false,
      });
      useUsageStore.getState().refresh();
      return data;
    } catch (error) {
      const isQuota = handleQuotaError(error);
      set({ error: isQuota ? null : errorMessage(error), generating: false });
      return null;
    }
  },
}));
