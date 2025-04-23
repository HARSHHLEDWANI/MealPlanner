import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Plus, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface RecipeGeneratorProps {
  userId: string;
  onRecipeGenerated?: (recipe: any) => void;
}

export function RecipeGenerator({ userId, onRecipeGenerated }: RecipeGeneratorProps) {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentIngredient, setCurrentIngredient] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleAddIngredient = () => {
    if (currentIngredient.trim()) {
      setIngredients([...ingredients, currentIngredient.trim()]);
      setCurrentIngredient('');
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddIngredient();
    }
  };

  const handleGenerateRecipe = async () => {
    if (ingredients.length === 0) {
      toast({
        title: 'No ingredients added',
        description: 'Please add at least one ingredient to generate a recipe.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
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
      onRecipeGenerated?.(recipe);
      toast({
        title: 'Recipe generated!',
        description: 'Your personalized recipe has been created.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate recipe. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Recipe Generator</h2>
        <p className="text-muted-foreground">
          Add ingredients you'd like to use, and we'll create a personalized recipe for you.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Enter an ingredient"
          value={currentIngredient}
          onChange={(e) => setCurrentIngredient(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isGenerating}
        />
        <Button
          onClick={handleAddIngredient}
          disabled={!currentIngredient.trim() || isGenerating}
          variant="secondary"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {ingredients.map((ingredient, index) => (
            <motion.div
              key={`${ingredient}-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full flex items-center gap-2"
            >
              <span>{ingredient}</span>
              <button
                onClick={() => handleRemoveIngredient(index)}
                className="text-secondary-foreground/50 hover:text-secondary-foreground"
                disabled={isGenerating}
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Button
        onClick={handleGenerateRecipe}
        disabled={ingredients.length === 0 || isGenerating}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Recipe...
          </>
        ) : (
          'Generate Recipe'
        )}
      </Button>
    </Card>
  );
} 