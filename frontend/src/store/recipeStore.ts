import { create } from 'zustand';
import { Recipe } from '../types';
import { supabase } from '../lib/supabase';
import { generateRecipesFromIngredients, enhanceRecipeWithAI } from '../lib/openai';

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
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*');

      if (error) throw error;
      
      const formattedRecipes = (data as Recipe[]).map(recipe => ({
        ...recipe,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
        saved: false
      }));
      
      set({ recipes: formattedRecipes, loading: false });
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
      
      if (data.length > 0) {
        const recipeIds = data.map(item => item.recipe_id);
        const { data: recipesData, error: recipesError } = await supabase
          .from('recipes')
          .select('*')
          .in('id', recipeIds);
          
        if (recipesError) throw recipesError;
        
        const formattedRecipes = (recipesData as Recipe[]).map(recipe => ({
          ...recipe,
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || [],
          saved: true
        }));
        
        set({ savedRecipes: formattedRecipes, loading: false });
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
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .textSearch('title', query, { 
          type: 'websearch',
          config: 'english' 
        });

      if (error) throw error;
      
      const formattedRecipes = (data as Recipe[]).map(recipe => ({
        ...recipe,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
        saved: false
      }));
      
      set({ searchResults: formattedRecipes, loading: false });
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
      // Use AI to generate recipes based on ingredients
      const generatedRecipes = await generateRecipesFromIngredients(ingredients);
      
      // Store generated recipes in Supabase for future reference
      const { data, error } = await supabase
        .from('recipes')
        .insert(generatedRecipes.map(recipe => ({
          ...recipe,
          user_generated: true,
          created_at: new Date().toISOString()
        })))
        .select();

      if (error) throw error;
      
      set({ searchResults: data as Recipe[], loading: false });
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
      
      const { savedRecipes } = get();
      set({ 
        savedRecipes: savedRecipes.filter(recipe => recipe.id !== recipeId) 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to unsave recipe' 
      });
    }
  },

  getRecipeDetails: async (recipeId: string): Promise<Recipe | null> => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        ingredients: data.ingredients || [],
        instructions: data.instructions || [],
        saved: false
      } as Recipe;
    } catch (error) {
      console.error('Error fetching recipe details:', error);
      return null;
    }
  },

  enhanceRecipe: async (recipeId: string) => {
    try {
      const recipe = await get().getRecipeDetails(recipeId);
      if (!recipe) throw new Error('Recipe not found');

      const enhancedData = await enhanceRecipeWithAI(recipe);
      
      // Update the recipe in Supabase with enhanced data
      const { error } = await supabase
        .from('recipes')
        .update({
          alternatives: enhancedData.alternatives,
          tips: enhancedData.tips,
          serving_suggestions: enhancedData.servingSuggestions,
          storage_instructions: enhancedData.storageInstructions,
          nutritional_info: enhancedData.nutritionalInfo,
          enhanced_at: new Date().toISOString()
        })
        .eq('id', recipeId);

      if (error) throw error;

      // Update the local state
      const { recipes } = get();
      set({
        recipes: recipes.map(r => 
          r.id === recipeId 
            ? { ...r, ...enhancedData }
            : r
        )
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to enhance recipe' 
      });
    }
  }
}));