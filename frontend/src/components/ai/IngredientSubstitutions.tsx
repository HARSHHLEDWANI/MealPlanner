import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface IngredientSubstitutionsProps {
  ingredients: string[];
  userId: string;
}

export function IngredientSubstitutions({ ingredients, userId }: IngredientSubstitutionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [substitutions, setSubstitutions] = useState<Record<string, string[]>>({});
  const { toast } = useToast();

  const handleGetSubstitutions = async () => {
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

      const data = await response.json();
      setSubstitutions(data);
      toast({
        title: 'Substitutions found!',
        description: 'Here are some alternatives for your ingredients.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get substitutions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Ingredient Substitutions</h3>
          <p className="text-muted-foreground text-sm">
            Find alternative ingredients that match your dietary preferences.
          </p>
        </div>

        <Button
          onClick={handleGetSubstitutions}
          disabled={isLoading || ingredients.length === 0}
          className="w-full mb-4"
          variant="secondary"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Finding Substitutions...
            </>
          ) : (
            'Find Substitutions'
          )}
        </Button>

        {Object.keys(substitutions).length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(substitutions).map(([ingredient, alternatives]) => (
              <AccordionItem key={ingredient} value={ingredient}>
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <span>{ingredient}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc list-inside space-y-1">
                    {alternatives.map((alt, index) => (
                      <li key={index} className="text-muted-foreground">
                        {alt}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </Card>
  );
} 