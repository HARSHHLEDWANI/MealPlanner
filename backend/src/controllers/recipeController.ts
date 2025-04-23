import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { model } from '../lib/gemini';
import { Recipe } from '../types';

export class RecipeController {
  async getAllRecipes(req: Request, res: Response) {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*');

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch recipes' });
    }
  }

  async getRecipeById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch recipe' });
    }
  }

  async searchRecipes(req: Request, res: Response) {
    try {
      const { query } = req.body;
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .textSearch('title', query);

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to search recipes' });
    }
  }

  async generateRecipes(req: Request, res: Response) {
    try {
      const { ingredients } = req.body;
      
      const prompt = `Generate 3 unique recipes using these ingredients: ${ingredients.join(', ')}. 
      Format the response as a JSON array with this structure:
      [
        {
          "title": "Creative Recipe Title",
          "ingredients": ["ingredient1 with quantity", "ingredient2 with quantity"],
          "instructions": ["step1", "step2"],
          "prepTime": "30 minutes",
          "servings": 4,
          "difficulty": "Easy/Medium/Hard"
        }
      ]`;

      const result = await model.generateContent(prompt);
      const recipes = JSON.parse(result.response.text());
      
      // Store generated recipes
      const { data, error } = await supabase
        .from('recipes')
        .insert(recipes.map((recipe: Recipe) => ({
          ...recipe,
          user_generated: true,
          created_at: new Date().toISOString()
        })))
        .select();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error('Error generating recipes:', error);
      res.status(500).json({ error: 'Failed to generate recipes' });
    }
  }

  async enhanceRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { data: recipe, error: fetchError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      const prompt = `Enhance this recipe with suggestions:
      Title: ${recipe.title}
      Ingredients: ${recipe.ingredients.join(', ')}
      Instructions: ${recipe.instructions.join('\n')}
      
      Format the response as a JSON object with this structure:
      {
        "alternativeIngredients": ["alternative1", "alternative2"],
        "cookingTips": ["tip1", "tip2"],
        "servingSuggestions": ["suggestion1", "suggestion2"],
        "storageInstructions": "Storage instructions here",
        "nutritionalInfo": {
          "calories": "per serving",
          "protein": "grams",
          "carbs": "grams",
          "fat": "grams"
        }
      }`;

      const result = await model.generateContent(prompt);
      const enhancements = JSON.parse(result.response.text());

      // Update recipe with enhancements
      const { data, error } = await supabase
        .from('recipes')
        .update({
          ...enhancements,
          enhanced_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error('Error enhancing recipe:', error);
      res.status(500).json({ error: 'Failed to enhance recipe' });
    }
  }

  async saveRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { user_id } = req.body;

      const { error } = await supabase
        .from('saved_recipes')
        .insert({ user_id, recipe_id: id });

      if (error) throw error;
      res.json({ message: 'Recipe saved successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save recipe' });
    }
  }

  async unsaveRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { user_id } = req.body;

      const { error } = await supabase
        .from('saved_recipes')
        .delete()
        .match({ user_id, recipe_id: id });

      if (error) throw error;
      res.json({ message: 'Recipe unsaved successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to unsave recipe' });
    }
  }
} 