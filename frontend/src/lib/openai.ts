import OpenAI from 'openai';

const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!openaiApiKey) {
  throw new Error('VITE_OPENAI_API_KEY is required');
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: openaiApiKey,
  dangerouslyAllowBrowser: true // Required for client-side usage
});

// Function to generate recipes from ingredients
export const generateRecipesFromIngredients = async (ingredients: string[]): Promise<any[]> => {
  try {
    const prompt = `Generate 3 unique recipes using these ingredients: ${ingredients.join(', ')}. 
    For each recipe, provide:
    1. A creative title
    2. A list of all ingredients needed (including quantities)
    3. Step-by-step instructions
    4. Preparation time
    5. Serving size
    6. Difficulty level (Easy/Medium/Hard)
    
    Format the response as a JSON array of objects with these properties:
    - title: string
    - ingredients: string[]
    - instructions: string[]
    - prepTime: string
    - servings: number
    - difficulty: string
    - imageUrl: string (use a placeholder URL)`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional chef and recipe generator. Create detailed, easy-to-follow recipes."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');

    return JSON.parse(content);
  } catch (error) {
    console.error('Error generating recipes:', error);
    throw error;
  }
};

// Function to enhance recipe with AI suggestions
export const enhanceRecipeWithAI = async (recipe: any): Promise<any> => {
  try {
    const prompt = `Enhance this recipe with AI suggestions:
    Title: ${recipe.title}
    Ingredients: ${recipe.ingredients.join(', ')}
    Instructions: ${recipe.instructions.join('\n')}
    
    Provide:
    1. Alternative ingredients
    2. Cooking tips
    3. Serving suggestions
    4. Storage instructions
    5. Nutritional information (if possible)
    
    Format the response as a JSON object with these properties:
    - alternatives: string[]
    - tips: string[]
    - servingSuggestions: string[]
    - storageInstructions: string
    - nutritionalInfo: string`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional chef and recipe enhancer. Provide valuable suggestions to improve recipes."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');

    return JSON.parse(content);
  } catch (error) {
    console.error('Error enhancing recipe:', error);
    throw error;
  }
}; 