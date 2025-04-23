import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface MealPlanGeneratorProps {
  userId: string;
  onMealPlanGenerated?: (mealPlan: any) => void;
}

export function MealPlanGenerator({ userId, onMealPlanGenerated }: MealPlanGeneratorProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateMealPlan = async () => {
    if (!selectedDate) {
      toast({
        title: 'No date selected',
        description: 'Please select a start date for your meal plan.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`/api/ai/meal-plan/generate/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week_start_date: format(selectedDate, 'yyyy-MM-dd'),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate meal plan');
      }

      const mealPlan = await response.json();
      onMealPlanGenerated?.(mealPlan);
      toast({
        title: 'Meal plan generated!',
        description: 'Your personalized meal plan has been created.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate meal plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Meal Plan Generator</h2>
        <p className="text-muted-foreground">
          Generate a personalized weekly meal plan based on your preferences.
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          disabled={(date) => date < new Date()}
          className="rounded-md border"
        />

        <Button
          onClick={handleGenerateMealPlan}
          disabled={!selectedDate || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Meal Plan...
            </>
          ) : (
            'Generate Meal Plan'
          )}
        </Button>
      </div>
    </Card>
  );
} 