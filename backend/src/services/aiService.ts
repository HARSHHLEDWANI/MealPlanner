import { GoogleGenerativeAI } from '@google/generative-ai';
import { Recipe, UserPreferences, MealPlan } from '../types';
import { model } from '../lib/gemini';

class AIService {
  async generateRecipe(query: string, cuisine?: string): Promise<Recipe> {
    try {
      const prompt = `Generate a detailed recipe for ${query}${cuisine ? ` in ${cuisine} cuisine` : ''}.
      Include ingredients list and step-by-step instructions. Format as JSON with the following structure:
      {
        "name": "Recipe Name",
        "ingredients": ["ingredient1", "ingredient2"],
        "instructions": ["step1", "step2"],
        "cookingTime": minutes,
        "servings": number
      }`;

      const result = await model.generateContent(prompt);
      const response = JSON.parse(result.response.text());
      return {
        id: Date.now().toString(), // Temporary ID
        ...response
      };
    } catch (error) {
      console.error('Error generating recipe:', error);
      throw new Error('Failed to generate recipe');
    }
  }

  async generateMealPlan(preferences: any, duration: number): Promise<MealPlan> {
    try {
      const prompt = `Generate a ${duration}-day meal plan considering these preferences: ${JSON.stringify(preferences)}.
      Format as JSON with the following structure:
      {
        "meals": [
          {
            "day": "Monday",
            "mealType": "Breakfast/Lunch/Dinner",
            "recipe": {
              "name": "Recipe Name",
              "ingredients": ["ingredient1", "ingredient2"],
              "instructions": ["step1", "step2"],
              "cookingTime": minutes,
              "servings": number
            }
          }
        ]
      }`;

      const result = await model.generateContent(prompt);
      const response = JSON.parse(result.response.text());
      return {
        id: Date.now().toString(),
        userId: preferences.userId,
        startDate: new Date(),
        endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
        ...response
      };
    } catch (error) {
      console.error('Error generating meal plan:', error);
      throw new Error('Failed to generate meal plan');
    }
  }

  async enhanceRecipe(recipe: Recipe): Promise<Recipe> {
    try {
      const prompt = `Enhance this recipe with more detailed instructions and ingredient measurements:
      ${JSON.stringify(recipe)}
      Keep the same JSON structure but add more detail and professional cooking techniques.`;

      const result = await model.generateContent(prompt);
      const response = JSON.parse(result.response.text());
      return {
        ...recipe,
        ...response
      };
    } catch (error) {
      console.error('Error enhancing recipe:', error);
      throw new Error('Failed to enhance recipe');
    }
  }

  async suggestSubstitutions(ingredient: string, reason?: string): Promise<any> {
    try {
      const prompt = `Suggest substitutions for ${ingredient}${reason ? ` considering ${reason}` : ''}.
      Format as JSON with the following structure:
      {
        "substitutions": [
          {
            "ingredient": "substitute name",
            "ratio": "substitution ratio",
            "notes": "usage notes"
          }
        ]
      }`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (error) {
      console.error('Error suggesting substitutions:', error);
      throw new Error('Failed to suggest substitutions');
    }
  }
}

export const aiService = new AIService(); 