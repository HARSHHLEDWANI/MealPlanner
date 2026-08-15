import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { actingUserId } from '../middleware/auth';
import { assertOwnsMealPlan } from '../lib/ownership';
import { notFound } from '../lib/errors';
import { MealPlanItem } from '../types';

/** Selects a plan with its items and each item's full recipe. */
const PLAN_WITH_MEALS = `
  *,
  meals:meal_plan_items(
    *,
    recipe:recipes(*)
  )
`;

export class MealPlanController {
  /**
   * The caller's current or next upcoming plan.
   *
   * Compares against today's calendar date. The previous version compared a
   * DATE column to a full ISO timestamp, so a plan starting today was excluded
   * for most of the day.
   */
  getCurrentMealPlan = async (req: Request, res: Response) => {
    const userId = actingUserId(req);
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('meal_plans')
      .select(PLAN_WITH_MEALS)
      .eq('user_id', userId)
      .gte('week_start_date', today)
      .order('week_start_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw notFound('Meal plan');

    res.json(data);
  };

  createMealPlan = async (req: Request, res: Response) => {
    const userId = actingUserId(req);
    const { week_start_date, meals } = req.body as {
      week_start_date: string;
      meals: MealPlanItem[];
    };

    const { data: mealPlan, error: planError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: userId,
        week_start_date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (planError) throw planError;

    if (meals.length > 0) {
      const { error: itemsError } = await supabase.from('meal_plan_items').insert(
        meals.map((meal) => ({
          recipe_id: meal.recipe_id,
          day_of_week: meal.day_of_week,
          meal_type: meal.meal_type,
          servings: meal.servings,
          meal_plan_id: mealPlan.id,
          created_at: new Date().toISOString(),
        }))
      );

      if (itemsError) {
        // Roll back by hand — Supabase's REST client has no transaction, and a
        // plan with no items is worse than no plan at all.
        await supabase.from('meal_plans').delete().eq('id', mealPlan.id);
        throw itemsError;
      }
    }

    const { data: completePlan, error: fetchError } = await supabase
      .from('meal_plans')
      .select(PLAN_WITH_MEALS)
      .eq('id', mealPlan.id)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json(completePlan);
  };

  updateMealPlan = async (req: Request, res: Response) => {
    const userId = actingUserId(req);
    const { id } = req.params;
    const { meals } = req.body as { meals: MealPlanItem[] };

    await assertOwnsMealPlan(id, userId);

    const { error: updateError } = await supabase
      .from('meal_plans')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) throw updateError;

    const { error: deleteError } = await supabase
      .from('meal_plan_items')
      .delete()
      .eq('meal_plan_id', id);

    if (deleteError) throw deleteError;

    if (meals.length > 0) {
      const { error: insertError } = await supabase.from('meal_plan_items').insert(
        meals.map((meal) => ({
          recipe_id: meal.recipe_id,
          day_of_week: meal.day_of_week,
          meal_type: meal.meal_type,
          servings: meal.servings,
          meal_plan_id: id,
          created_at: new Date().toISOString(),
        }))
      );

      if (insertError) throw insertError;
    }

    const { data: updatedPlan, error: fetchError } = await supabase
      .from('meal_plans')
      .select(PLAN_WITH_MEALS)
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    res.json(updatedPlan);
  };

  deleteMealPlan = async (req: Request, res: Response) => {
    const userId = actingUserId(req);
    const { id } = req.params;

    await assertOwnsMealPlan(id, userId);

    const { error } = await supabase.from('meal_plans').delete().eq('id', id);
    if (error) throw error;

    res.json({ message: 'Meal plan deleted successfully' });
  };
}
