import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecipeGenerator } from '@/components/ai/RecipeGenerator';
import { MealPlanGenerator } from '@/components/ai/MealPlanGenerator';
import { RecipeEnhancer } from '@/components/ai/RecipeEnhancer';
import { IngredientSubstitutions } from '@/components/ai/IngredientSubstitutions';
import { useUser } from '@/hooks/useUser';
import { Recipe } from '@/types';

export default function AIPage() {
  const { user } = useUser();
  const [selectedRecipe, setSelectedRecipe] = React.useState<Recipe | null>(null);
  const [ingredients, setIngredients] = React.useState<string[]>([]);

  const handleRecipeGenerated = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIngredients(recipe.ingredients);
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Please Sign In</h1>
          <p className="text-muted-foreground">
            You need to be signed in to use the AI features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Kitchen Assistant</h1>
        <p className="text-muted-foreground">
          Use AI to generate recipes, create meal plans, and get cooking suggestions.
        </p>
      </div>

      <Tabs defaultValue="recipe" className="space-y-6">
        <TabsList>
          <TabsTrigger value="recipe">Recipe Generator</TabsTrigger>
          <TabsTrigger value="mealplan">Meal Plan Generator</TabsTrigger>
          <TabsTrigger value="enhance" disabled={!selectedRecipe}>
            Recipe Enhancer
          </TabsTrigger>
          <TabsTrigger value="substitutions" disabled={ingredients.length === 0}>
            Ingredient Substitutions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recipe" className="space-y-6">
          <RecipeGenerator
            userId={user.id}
            onRecipeGenerated={handleRecipeGenerated}
          />
          {selectedRecipe && (
            <div className="mt-6">
              <h2 className="text-2xl font-bold mb-4">Generated Recipe</h2>
              <pre className="bg-muted p-4 rounded-lg overflow-auto">
                {JSON.stringify(selectedRecipe, null, 2)}
              </pre>
            </div>
          )}
        </TabsContent>

        <TabsContent value="mealplan">
          <MealPlanGenerator userId={user.id} />
        </TabsContent>

        <TabsContent value="enhance">
          {selectedRecipe && (
            <RecipeEnhancer
              recipe={selectedRecipe}
              userId={user.id}
              onRecipeEnhanced={setSelectedRecipe}
            />
          )}
        </TabsContent>

        <TabsContent value="substitutions">
          {ingredients.length > 0 && (
            <IngredientSubstitutions
              ingredients={ingredients}
              userId={user.id}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 