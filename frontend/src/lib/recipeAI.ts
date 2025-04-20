import { Recipe } from '../types';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

interface AIRecipeResponse {
  recipes: Recipe[];
}

export async function generateRecipesFromIngredients(ingredients: string[]): Promise<Recipe[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a creative chef who can suggest recipes based on available ingredients. Provide detailed, realistic recipes with exact measurements and clear instructions."
          },
          {
            role: "user",
            content: `Generate 3 possible recipes using some or all of these ingredients: ${ingredients.join(', ')}. 
            Format the response as a JSON array of recipes, where each recipe has:
            - id (string, uuid format)
            - title (string)
            - description (string)
            - prep_time (number in minutes)
            - cook_time (number in minutes)
            - serving_size (number)
            - ingredients (array of objects with name, amount, and unit)
            - instructions (array of strings)
            - tags (array of strings for dietary info and cuisine type)
            Only include ingredients that were listed or are common pantry items (salt, pepper, oil, etc).`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate recipes');
    }

    const data = await response.json();
    const recipesJson = JSON.parse(data.choices[0].message.content);
    
    // Add default values for missing fields and ensure proper formatting
    const formattedRecipes: Recipe[] = recipesJson.map((recipe: any) => ({
      ...recipe,
      image_url: `/recipe-placeholder-${Math.floor(Math.random() * 3) + 1}.jpg`, // Use placeholder images
      saved: false
    }));

    return formattedRecipes;
  } catch (error) {
    console.error('Error generating recipes:', error);
    throw error;
  }
}

export async function enhanceRecipeWithAI(recipe: Recipe): Promise<Recipe> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional chef who can enhance recipes with additional details and tips."
          },
          {
            role: "user",
            content: `Enhance this recipe with more detailed instructions and cooking tips:
            ${JSON.stringify(recipe, null, 2)}
            Keep the same JSON structure but add more detailed instructions and cooking tips.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error('Failed to enhance recipe');
    }

    const data = await response.json();
    const enhancedRecipe = JSON.parse(data.choices[0].message.content);
    
    return {
      ...enhancedRecipe,
      id: recipe.id, // Keep the original ID
      image_url: recipe.image_url, // Keep the original image
      saved: recipe.saved // Keep the saved status
    };
  } catch (error) {
    console.error('Error enhancing recipe:', error);
    throw error;
  }
} 