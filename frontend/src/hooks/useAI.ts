import { useState } from 'react';
import { Recipe } from '@/types';
import { useToast } from '@/components/ui/use-toast';

interface UseAIOptions {
  userId: string;
}

export function useAI({ userId }: UseAIOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateRecipe = async (ingredients: string[]): Promise<Recipe | null> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ai/recipe/generate/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredients }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate recipe');
      }

      const recipe = await response.json();
      toast({
        title: 'Recipe generated!',
        description: 'Your personalized recipe has been created.',
      });
      return recipe;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate recipe. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const generateMealPlan = async (weekStartDate: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ai/meal-plan/generate/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ week_start_date: weekStartDate }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate meal plan');
      }

      const mealPlan = await response.json();
      toast({
        title: 'Meal plan generated!',
        description: 'Your personalized meal plan has been created.',
      });
      return mealPlan;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate meal plan. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const enhanceRecipe = async (recipeId: string): Promise<Recipe | null> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ai/recipe/enhance/${recipeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to enhance recipe');
      }

      const enhancedRecipe = await response.json();
      toast({
        title: 'Recipe enhanced!',
        description: 'Your recipe has been improved with professional tips and variations.',
      });
      return enhancedRecipe;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to enhance recipe. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getSubstitutions = async (ingredients: string[]): Promise<Record<string, string[]> | null> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ai/ingredients/substitute/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredients }),
      });

      if (!response.ok) {
        throw new Error('Failed to get substitutions');
      }

      const substitutions = await response.json();
      toast({
        title: 'Substitutions found!',
        description: 'Here are some alternatives for your ingredients.',
      });
      return substitutions;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get substitutions. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    generateRecipe,
    generateMealPlan,
    enhanceRecipe,
    getSubstitutions,
  };
} 