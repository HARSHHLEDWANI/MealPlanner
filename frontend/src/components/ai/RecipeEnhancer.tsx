import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Recipe } from '@/types';

interface RecipeEnhancerProps {
  recipe: Recipe;
  userId: string;
  onRecipeEnhanced?: (recipe: Recipe) => void;
}

export function RecipeEnhancer({ recipe, userId, onRecipeEnhanced }: RecipeEnhancerProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { toast } = useToast();

  const handleEnhanceRecipe = async () => {
    setIsEnhancing(true);
    try {
      const response = await fetch(`/api/ai/recipe/enhance/${recipe.id}`, {
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
      onRecipeEnhanced?.(enhancedRecipe);
      toast({
        title: 'Recipe enhanced!',
        description: 'Your recipe has been improved with professional tips and variations.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to enhance recipe. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Enhance Recipe</h3>
          <p className="text-muted-foreground text-sm">
            Get professional tips, variations, and improved instructions for this recipe.
          </p>
        </div>

        <Button
          onClick={handleEnhanceRecipe}
          disabled={isEnhancing}
          className="w-full"
          variant="secondary"
        >
          {isEnhancing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enhancing Recipe...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Enhance Recipe
            </>
          )}
        </Button>
      </div>
    </Card>
  );
} 