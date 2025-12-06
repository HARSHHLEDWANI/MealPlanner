import { Request, Response } from 'express';
import { aiService } from '../services/aiService';
import { supabase } from '../lib/supabase';
import { UserPreferences } from '../types';

export class AIController {
  /**
   * Generates a new recipe based on user preferences and available ingredients
   */
  async generateRecipe(req: Request, res: Response): Promise<void> {
    try {
      const { user_id } = req.params;
      const { query, cuisine } = req.body;

      // Fetch user preferences if available
      let userPreferences: UserPreferences | undefined;
      try {
        const { data } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user_id)
          .single();
        userPreferences = data || undefined;
      } catch (error) {
        // User preferences not found, continue without them
        console.log('No user preferences found, generating recipe without preferences');
      }

      const generatedRecipe = await aiService.generateRecipe(query, cuisine, userPreferences);
      
      // Save recipe to database
      const { data: savedRecipe, error: saveError } = await supabase
        .from('recipes')
        .insert({
          title: generatedRecipe.title,
          description: generatedRecipe.description,
          ingredients: generatedRecipe.ingredients,
          instructions: generatedRecipe.instructions,
          prep_time: generatedRecipe.prep_time,
          cook_time: generatedRecipe.cook_time,
          servings: generatedRecipe.servings,
          difficulty: generatedRecipe.difficulty,
          cuisine_type: generatedRecipe.cuisine_type,
          dietary_tags: generatedRecipe.dietary_tags,
          calories_per_serving: generatedRecipe.calories_per_serving,
          user_generated: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving recipe:', saveError);
        // Still return the generated recipe even if save fails
        return res.status(200).json(generatedRecipe);
      }

      res.status(200).json(savedRecipe);
    } catch (error) {
      console.error('Error generating recipe:', error);
      res.status(500).json({ error: 'Failed to generate recipe' });
    }
  }

  /**
   * Generates a meal plan for a user based on their preferences and constraints
   */
  async generateMealPlan(req: Request, res: Response): Promise<void> {
    try {
      const { user_id } = req.params;
      const { week_start_date } = req.body;

      if (!week_start_date) {
        return res.status(400).json({ error: 'week_start_date is required' });
      }

      // Fetch user preferences
      let userPreferences: UserPreferences | undefined;
      try {
        const { data } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user_id)
          .single();
        userPreferences = data || undefined;
      } catch (error) {
        console.log('No user preferences found, generating meal plan without preferences');
      }

      // Generate meal plan with recipes
      const { mealPlan, recipes } = await aiService.generateMealPlan(
        user_id,
        week_start_date,
        userPreferences
      );

      // Save all recipes to database first
      const recipeIdMap = new Map<string, string>(); // temp_id -> real_id
      
      for (const recipe of recipes) {
        const { data: savedRecipe, error: saveError } = await supabase
          .from('recipes')
          .insert({
            title: recipe.title,
            description: recipe.description,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            prep_time: recipe.prep_time,
            cook_time: recipe.cook_time,
            servings: recipe.servings,
            difficulty: recipe.difficulty,
            cuisine_type: recipe.cuisine_type,
            dietary_tags: recipe.dietary_tags,
            calories_per_serving: recipe.calories_per_serving,
            user_generated: true,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (saveError) {
          console.error('Error saving recipe:', saveError);
          throw new Error(`Failed to save recipe: ${recipe.title}`);
        }

        if (savedRecipe) {
          recipeIdMap.set(recipe.id, savedRecipe.id);
        }
      }

      // Create meal plan
      const { data: savedMealPlan, error: mealPlanError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: mealPlan.user_id,
          week_start_date: mealPlan.week_start_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (mealPlanError) {
        throw new Error('Failed to create meal plan');
      }

      // Create meal plan items with real recipe IDs
      const mealPlanItems = mealPlan.meals.map(meal => ({
        meal_plan_id: savedMealPlan.id,
        recipe_id: recipeIdMap.get(meal.recipe_id) || meal.recipe_id,
        day_of_week: meal.day_of_week,
        meal_type: meal.meal_type,
        servings: meal.servings,
        created_at: new Date().toISOString()
      }));

      const { error: itemsError } = await supabase
        .from('meal_plan_items')
        .insert(mealPlanItems);

      if (itemsError) {
        throw new Error('Failed to create meal plan items');
      }

      // Fetch complete meal plan with items
      const { data: completePlan, error: fetchError } = await supabase
        .from('meal_plans')
        .select(`
          *,
          meals:meal_plan_items(
            *,
            recipe:recipes(*)
          )
        `)
        .eq('id', savedMealPlan.id)
        .single();

      if (fetchError) {
        throw new Error('Failed to fetch complete meal plan');
      }

      res.status(200).json(completePlan);
    } catch (error) {
      console.error('Error generating meal plan:', error);
      res.status(500).json({ 
        error: 'Failed to generate meal plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Enhances an existing recipe with additional details or improvements
   */
  async enhanceRecipe(req: Request, res: Response): Promise<void> {
    try {
      const { recipe_id } = req.params;

      // Fetch recipe from database
      const { data: recipe, error: fetchError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipe_id)
        .single();

      if (fetchError || !recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      const enhancements = await aiService.enhanceRecipe(recipe);

      // Update recipe with enhancements
      const { data: updatedRecipe, error: updateError } = await supabase
        .from('recipes')
        .update({
          ...enhancements,
          enhanced_at: new Date().toISOString()
        })
        .eq('id', recipe_id)
        .select()
        .single();

      if (updateError) {
        throw new Error('Failed to update recipe');
      }

      res.status(200).json(updatedRecipe);
    } catch (error) {
      console.error('Error enhancing recipe:', error);
      res.status(500).json({ error: 'Failed to enhance recipe' });
    }
  }

  /**
   * Suggests ingredient substitutions based on availability or dietary needs
   */
  async suggestSubstitutions(req: Request, res: Response): Promise<void> {
    try {
      const { user_id } = req.params;
      const { ingredient, reason } = req.body;

      if (!ingredient) {
        return res.status(400).json({ error: 'ingredient is required' });
      }

      // Fetch user preferences for dietary restrictions
      let dietaryRestrictions: string[] = [];
      try {
        const { data } = await supabase
          .from('user_preferences')
          .select('dietary_restrictions, allergies')
          .eq('user_id', user_id)
          .single();
        
        if (data) {
          dietaryRestrictions = [
            ...(data.dietary_restrictions || []),
            ...(data.allergies || [])
          ];
        }
      } catch (error) {
        // Continue without preferences
      }

      const substitutions = await aiService.suggestSubstitutions(
        ingredient, 
        reason, 
        dietaryRestrictions
      );
      
      res.status(200).json(substitutions);
    } catch (error) {
      console.error('Error suggesting substitutions:', error);
      res.status(500).json({ error: 'Failed to suggest substitutions' });
    }
  }
} 