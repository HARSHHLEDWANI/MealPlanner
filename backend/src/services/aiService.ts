import { GoogleGenerativeAI } from '@google/generative-ai';
import { Recipe, UserPreferences, MealPlan, MealPlanItem } from '../types';
import { model } from '../lib/gemini';
import { supabase } from '../lib/supabase';

class AIService {
  /**
   * Extracts JSON from AI response, handling markdown code blocks
   */
  private extractJSON(text: string): any {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Try to find JSON object in the text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
    
    // Fallback: try parsing the whole text
    return JSON.parse(text);
  }

  async generateRecipe(query: string, cuisine?: string, userPreferences?: UserPreferences): Promise<Recipe> {
    try {
      const dietaryInfo = userPreferences 
        ? `Dietary restrictions: ${userPreferences.dietary_restrictions.join(', ') || 'none'}. Allergies: ${userPreferences.allergies.join(', ') || 'none'}.`
        : '';
      
      const skillLevel = userPreferences?.cooking_skill_level || 'Intermediate';
      const servings = userPreferences?.serving_size || 2;

      const prompt = `You are a professional chef. Generate a detailed, practical recipe for "${query}"${cuisine ? ` in ${cuisine} cuisine style` : ''}.

${dietaryInfo ? `IMPORTANT: ${dietaryInfo} Ensure the recipe complies with these requirements.` : ''}

The recipe should be suitable for ${skillLevel} cooking skill level and serve ${servings} people.

Return ONLY valid JSON (no markdown, no explanations) with this exact structure:
{
  "title": "Recipe Name",
  "description": "Brief description of the dish",
  "ingredients": ["1 cup ingredient1", "2 tbsp ingredient2", "3 cloves ingredient3"],
  "instructions": ["Step 1: Detailed instruction", "Step 2: Detailed instruction"],
  "prep_time": 15,
  "cook_time": 30,
  "servings": ${servings},
  "difficulty": "Easy",
  "cuisine_type": "${cuisine || 'General'}",
  "dietary_tags": ["tag1", "tag2"],
  "calories_per_serving": 350
}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const response = this.extractJSON(responseText);
      
      return {
        id: Date.now().toString(), // Temporary ID, will be replaced when saved
        title: response.title || query,
        description: response.description || '',
        ingredients: response.ingredients || [],
        instructions: response.instructions || [],
        prep_time: response.prep_time || 0,
        cook_time: response.cook_time || 0,
        servings: response.servings || servings,
        difficulty: response.difficulty || 'Medium',
        cuisine_type: response.cuisine_type || cuisine || 'General',
        dietary_tags: response.dietary_tags || [],
        calories_per_serving: response.calories_per_serving,
        user_generated: true,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating recipe:', error);
      throw new Error('Failed to generate recipe');
    }
  }

  async generateMealPlan(
    userId: string, 
    weekStartDate: string, 
    userPreferences?: UserPreferences
  ): Promise<{ mealPlan: any; recipes: Recipe[] }> {
    try {
      // Build preference context
      const dietaryRestrictions = userPreferences?.dietary_restrictions || [];
      const allergies = userPreferences?.allergies || [];
      const preferredCuisines = userPreferences?.preferred_cuisines || [];
      const skillLevel = userPreferences?.cooking_skill_level || 'Intermediate';
      const servingSize = userPreferences?.serving_size || 2;

      const preferenceContext = `
User Preferences:
- Dietary Restrictions: ${dietaryRestrictions.length > 0 ? dietaryRestrictions.join(', ') : 'None'}
- Allergies: ${allergies.length > 0 ? allergies.join(', ') : 'None'}
- Preferred Cuisines: ${preferredCuisines.length > 0 ? preferredCuisines.join(', ') : 'Any'}
- Cooking Skill Level: ${skillLevel}
- Serving Size: ${servingSize} people
`;

      const weekStart = new Date(weekStartDate);
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      const prompt = `You are a professional meal planning assistant. Generate a complete 7-day meal plan starting from ${weekStartDate}.

${preferenceContext}

CRITICAL REQUIREMENTS:
${allergies.length > 0 ? `- ABSOLUTELY NO ingredients containing: ${allergies.join(', ')}` : ''}
${dietaryRestrictions.length > 0 ? `- Must comply with: ${dietaryRestrictions.join(', ')}` : ''}
- Recipes should be suitable for ${skillLevel} cooking level
- Each meal should serve ${servingSize} people
- Ensure variety across the week (don't repeat the same dish)
- Balance nutrition across breakfast, lunch, and dinner
${preferredCuisines.length > 0 ? `- Prefer ${preferredCuisines.join(', ')} cuisines when possible` : ''}

Return ONLY valid JSON (no markdown, no explanations) with this exact structure:
{
  "meals": [
    {
      "day_of_week": 0,
      "meal_type": "breakfast",
      "recipe": {
        "title": "Recipe Name",
        "description": "Brief description",
        "ingredients": ["1 cup ingredient", "2 tbsp ingredient"],
        "instructions": ["Step 1", "Step 2"],
        "prep_time": 10,
        "cook_time": 20,
        "servings": ${servingSize},
        "difficulty": "Easy",
        "cuisine_type": "Cuisine name",
        "dietary_tags": ["tag1", "tag2"],
        "calories_per_serving": 300
      }
    }
  ]
}

Generate 21 meals total (7 days × 3 meals: breakfast, lunch, dinner). Use day_of_week: 0 for Sunday, 1 for Monday, etc.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const response = this.extractJSON(responseText);

      if (!response.meals || !Array.isArray(response.meals)) {
        throw new Error('Invalid meal plan structure from AI');
      }

      // Extract unique recipes and prepare them for database
      const recipeMap = new Map<string, Recipe>();
      const mealPlanItems: Omit<MealPlanItem, 'id' | 'meal_plan_id' | 'created_at'>[] = [];

      response.meals.forEach((meal: any, index: number) => {
        const recipeKey = `${meal.recipe.title}-${meal.meal_type}`;
        
        if (!recipeMap.has(recipeKey)) {
          const recipe: Recipe = {
            id: `temp-${Date.now()}-${index}`, // Temporary ID
            title: meal.recipe.title,
            description: meal.recipe.description || '',
            ingredients: meal.recipe.ingredients || [],
            instructions: meal.recipe.instructions || [],
            prep_time: meal.recipe.prep_time || 0,
            cook_time: meal.recipe.cook_time || 0,
            servings: meal.recipe.servings || servingSize,
            difficulty: meal.recipe.difficulty || 'Medium',
            cuisine_type: meal.recipe.cuisine_type || 'General',
            dietary_tags: meal.recipe.dietary_tags || [],
            calories_per_serving: meal.recipe.calories_per_serving,
            user_generated: true,
            created_at: new Date().toISOString()
          };
          recipeMap.set(recipeKey, recipe);
        }

        mealPlanItems.push({
          recipe_id: recipeMap.get(recipeKey)!.id,
          day_of_week: meal.day_of_week as 0 | 1 | 2 | 3 | 4 | 5 | 6,
          meal_type: meal.meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack',
          servings: servingSize
        });
      });

      return {
        mealPlan: {
          user_id: userId,
          week_start_date: weekStartDate,
          meals: mealPlanItems
        },
        recipes: Array.from(recipeMap.values())
      };
    } catch (error) {
      console.error('Error generating meal plan:', error);
      throw new Error('Failed to generate meal plan');
    }
  }

  async enhanceRecipe(recipe: Recipe): Promise<Partial<Recipe>> {
    try {
      const prompt = `You are a professional chef. Enhance this recipe with more detailed instructions, precise ingredient measurements, and professional cooking techniques:

Title: ${recipe.title}
Description: ${recipe.description}
Ingredients: ${recipe.ingredients.join(', ')}
Instructions: ${recipe.instructions.join('\n')}
Cooking Time: ${recipe.prep_time + recipe.cook_time} minutes
Difficulty: ${recipe.difficulty}

Provide enhancements including:
- More precise ingredient measurements
- Professional cooking tips and techniques
- Alternative preparation methods
- Serving suggestions
- Storage instructions

Return ONLY valid JSON (no markdown, no explanations) with this structure:
{
  "description": "Enhanced description",
  "ingredients": ["precise measurements"],
  "instructions": ["enhanced step-by-step instructions"],
  "cookingTips": ["tip1", "tip2"],
  "servingSuggestions": ["suggestion1", "suggestion2"],
  "storageInstructions": "How to store leftovers"
}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const enhancements = this.extractJSON(responseText);
      
      return {
        description: enhancements.description || recipe.description,
        ingredients: enhancements.ingredients || recipe.ingredients,
        instructions: enhancements.instructions || recipe.instructions,
        ...enhancements
      };
    } catch (error) {
      console.error('Error enhancing recipe:', error);
      throw new Error('Failed to enhance recipe');
    }
  }

  async suggestSubstitutions(ingredient: string, reason?: string, dietaryRestrictions?: string[]): Promise<any> {
    try {
      const dietaryContext = dietaryRestrictions && dietaryRestrictions.length > 0
        ? ` Consider dietary restrictions: ${dietaryRestrictions.join(', ')}.`
        : '';

      const prompt = `You are a culinary expert. Suggest practical ingredient substitutions for "${ingredient}"${reason ? ` considering: ${reason}` : ''}.${dietaryContext}

Provide substitutions that:
- Maintain similar flavor and texture when possible
- Are readily available
- Include proper ratios/conversions
- Note any recipe adjustments needed

Return ONLY valid JSON (no markdown, no explanations) with this structure:
{
  "substitutions": [
    {
      "ingredient": "substitute name",
      "ratio": "1:1 or specific ratio",
      "notes": "When to use and any recipe adjustments",
      "flavorImpact": "Similar/Different",
      "textureImpact": "Similar/Different"
    }
  ]
}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      return this.extractJSON(responseText);
    } catch (error) {
      console.error('Error suggesting substitutions:', error);
      throw new Error('Failed to suggest substitutions');
    }
  }
}

export const aiService = new AIService(); 