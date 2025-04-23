import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { MealPlan, MealPlanItem } from '../types';

export class MealPlanController {
  async getCurrentMealPlan(req: Request, res: Response) {
    try {
      const { user_id } = req.params;
      const today = new Date();
      
      const { data, error } = await supabase
        .from('meal_plans')
        .select(`
          *,
          meals:meal_plan_items(*)
        `)
        .eq('user_id', user_id)
        .gte('week_start_date', today.toISOString())
        .order('week_start_date', { ascending: true })
        .limit(1)
        .single();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: 'No current meal plan found' });
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch meal plan' });
    }
  }

  async createMealPlan(req: Request, res: Response) {
    try {
      const { user_id } = req.params;
      const { week_start_date, meals }: MealPlan = req.body;

      // Start a transaction
      const { data: mealPlan, error: mealPlanError } = await supabase
        .from('meal_plans')
        .insert({
          user_id,
          week_start_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (mealPlanError) throw mealPlanError;

      // Insert meal plan items
      const mealItems = meals.map(meal => ({
        ...meal,
        meal_plan_id: mealPlan.id,
        created_at: new Date().toISOString()
      }));

      const { error: mealsError } = await supabase
        .from('meal_plan_items')
        .insert(mealItems);

      if (mealsError) throw mealsError;

      // Fetch the complete meal plan with items
      const { data: completePlan, error: fetchError } = await supabase
        .from('meal_plans')
        .select(`
          *,
          meals:meal_plan_items(*)
        `)
        .eq('id', mealPlan.id)
        .single();

      if (fetchError) throw fetchError;
      res.json(completePlan);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create meal plan' });
    }
  }

  async updateMealPlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { meals }: { meals: MealPlanItem[] } = req.body;

      // Update meal plan timestamp
      const { error: updateError } = await supabase
        .from('meal_plans')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      // Delete existing meal items
      const { error: deleteError } = await supabase
        .from('meal_plan_items')
        .delete()
        .eq('meal_plan_id', id);

      if (deleteError) throw deleteError;

      // Insert new meal items
      const { error: insertError } = await supabase
        .from('meal_plan_items')
        .insert(
          meals.map(meal => ({
            ...meal,
            meal_plan_id: id,
            created_at: new Date().toISOString()
          }))
        );

      if (insertError) throw insertError;

      // Fetch updated meal plan
      const { data: updatedPlan, error: fetchError } = await supabase
        .from('meal_plans')
        .select(`
          *,
          meals:meal_plan_items(*)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      res.json(updatedPlan);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update meal plan' });
    }
  }

  async deleteMealPlan(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.json({ message: 'Meal plan deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete meal plan' });
    }
  }
} 