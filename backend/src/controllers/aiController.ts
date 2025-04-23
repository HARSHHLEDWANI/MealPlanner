import { Request, Response } from 'express';
import { aiService } from '../services/aiService';

interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  instructions: string[];
  cookingTime: number;
  servings: number;
}

interface MealPlan {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  meals: {
    day: string;
    mealType: string;
    recipe: Recipe;
  }[];
}

export class AIController {
  /**
   * Generates a new recipe based on user preferences and available ingredients
   */
  async generateRecipe(req: Request, res: Response): Promise<void> {
    try {
      const { user_id } = req.params;
      const { query, cuisine } = req.body;

      const generatedRecipe = await aiService.generateRecipe(query, cuisine);
      res.status(200).json(generatedRecipe);
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
      const { preferences, duration } = req.body;

      const generatedMealPlan = await aiService.generateMealPlan({
        ...preferences,
        userId: user_id
      }, duration);

      res.status(200).json(generatedMealPlan);
    } catch (error) {
      console.error('Error generating meal plan:', error);
      res.status(500).json({ error: 'Failed to generate meal plan' });
    }
  }

  /**
   * Enhances an existing recipe with additional details or improvements
   */
  async enhanceRecipe(req: Request, res: Response): Promise<void> {
    try {
      const { recipe_id } = req.params;
      const { recipe } = req.body;

      const enhancedRecipe = await aiService.enhanceRecipe({
        ...recipe,
        id: recipe_id
      });

      res.status(200).json(enhancedRecipe);
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

      const substitutions = await aiService.suggestSubstitutions(ingredient, reason);
      res.status(200).json(substitutions);
    } catch (error) {
      console.error('Error suggesting substitutions:', error);
      res.status(500).json({ error: 'Failed to suggest substitutions' });
    }
  }
} 