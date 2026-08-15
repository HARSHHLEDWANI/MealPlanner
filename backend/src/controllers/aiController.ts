import { Request, Response } from 'express';
import { aiService } from '../services/aiService';
import { supabase } from '../lib/supabase';
import { actingUserId } from '../middleware/auth';
import { refundQuota } from '../middleware/quota';
import { usageService } from '../services/usageService';
import { notFound, upstreamFailure } from '../lib/errors';
import { Recipe, UserPreferences } from '../types';

/**
 * Loads a user's preferences, or undefined if they have none.
 *
 * Absent preferences are normal, not an error — the AI prompts degrade to
 * sensible defaults without them.
 */
async function loadPreferences(userId: string): Promise<UserPreferences | undefined> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Could not load user preferences; continuing without them', error);
    return undefined;
  }

  return data ?? undefined;
}

/** Maps a generated recipe onto the recipes table's columns. */
function toRecipeRow(recipe: Recipe, userId: string) {
  return {
    title: recipe.title,
    description: recipe.description,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    prep_time: recipe.prep_time,
    cook_time: recipe.cook_time,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    cuisine_type: recipe.cuisine_type,
    dietary_tags: recipe.dietary_tags,
    calories_per_serving: recipe.calories_per_serving,
    user_generated: true,
    created_by: userId,
    created_at: new Date().toISOString(),
  };
}

export class AIController {
  /** Reports today's AI usage so the UI can show what is left. */
  getUsage = async (req: Request, res: Response) => {
    const userId = actingUserId(req);
    res.json(await usageService.current(userId));
  };

  /** Generates a recipe from a free-text query and saves it. */
  generateRecipe = async (req: Request, res: Response) => {
    const userId = actingUserId(req);
    const { query, cuisine } = req.body as { query: string; cuisine?: string };

    const preferences = await loadPreferences(userId);

    // Asking the same thing twice in quick succession — a double-clicked
    // button, a retried request — should not be billed twice.
    const cacheKey = usageService.cacheKey('recipe_generate', userId, { query, cuisine }, preferences);
    const cached = await usageService.readCache<Recipe>(cacheKey);
    if (cached) {
      // No model call happened, so the reservation is given back.
      await refundQuota(req);
      return res.status(200).json(cached);
    }

    let generated: Recipe;
    try {
      generated = await aiService.generateRecipe(query, cuisine, preferences);
    } catch (error) {
      await refundQuota(req);
      throw error;
    }

    const { data: saved, error } = await supabase
      .from('recipes')
      .insert(toRecipeRow(generated, userId))
      .select()
      .single();

    if (error) {
      // The generation itself succeeded and already cost a model call, so
      // return it rather than making the user pay to retry.
      console.error('Generated recipe could not be saved', error);
      return res.status(200).json({ ...generated, persisted: false });
    }

    await usageService.writeCache(cacheKey, userId, 'recipe_generate', saved);

    res.status(201).json(saved);
  };

  /**
   * Generates a full week of meals, persists the recipes, the plan, and the
   * plan items, then returns the assembled plan.
   */
  generateMealPlan = async (req: Request, res: Response) => {
    const userId = actingUserId(req);
    const { week_start_date } = req.body as { week_start_date: string };

    const preferences = await loadPreferences(userId);

    let mealPlan: { user_id: string; week_start_date: string; meals: any[] };
    let recipes: Recipe[];
    try {
      // Not cached: a meal plan is expected to differ each time it is asked
      // for, and serving a stale one would defeat the point of regenerating.
      ({ mealPlan, recipes } = await aiService.generateMealPlan(
        userId,
        week_start_date,
        preferences
      ));
    } catch (error) {
      await refundQuota(req);
      throw error;
    }

    // Insert every generated recipe in one round trip. This was a sequential
    // await inside a loop — up to 21 round trips per request.
    const { data: savedRecipes, error: recipesError } = await supabase
      .from('recipes')
      .insert(recipes.map((recipe) => toRecipeRow(recipe, userId)))
      .select();

    if (recipesError) throw recipesError;

    // insert() returns rows in input order, so zip them back to their
    // temporary IDs to resolve the plan items' references.
    const recipeIdMap = new Map<string, string>();
    recipes.forEach((recipe, index) => {
      const saved = savedRecipes?.[index];
      if (saved) recipeIdMap.set(recipe.id, saved.id);
    });

    const savedRecipeIds = (savedRecipes ?? []).map((r) => r.id);

    /** Removes everything written so far. Supabase's REST client has no transactions. */
    const rollback = async (planId?: string) => {
      if (planId) await supabase.from('meal_plans').delete().eq('id', planId);
      if (savedRecipeIds.length > 0) {
        await supabase.from('recipes').delete().in('id', savedRecipeIds);
      }
    };

    const { data: savedPlan, error: planError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: userId,
        week_start_date: mealPlan.week_start_date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (planError) {
      await rollback();
      throw planError;
    }

    const items = mealPlan.meals
      .map((meal: { recipe_id: string; day_of_week: number; meal_type: string; servings: number }) => ({
        meal_plan_id: savedPlan.id,
        recipe_id: recipeIdMap.get(meal.recipe_id),
        day_of_week: meal.day_of_week,
        meal_type: meal.meal_type,
        servings: meal.servings,
        created_at: new Date().toISOString(),
      }))
      .filter((item: { recipe_id?: string }) => Boolean(item.recipe_id));

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from('meal_plan_items').insert(items);
      if (itemsError) {
        await rollback(savedPlan.id);
        throw itemsError;
      }
    }

    const { data: completePlan, error: fetchError } = await supabase
      .from('meal_plans')
      .select(`*, meals:meal_plan_items(*, recipe:recipes(*))`)
      .eq('id', savedPlan.id)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json(completePlan);
  };

  /** Rewrites a recipe with professional technique, tips, and storage notes. */
  enhanceRecipe = async (req: Request, res: Response) => {
    const userId = actingUserId(req);
    const { recipe_id } = req.params;

    const { data: recipe, error: fetchError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipe_id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!recipe) {
      // The recipe never existed, so no model call was made.
      await refundQuota(req);
      throw notFound('Recipe');
    }

    let enhancement;
    try {
      enhancement = await aiService.enhanceRecipe(recipe);
    } catch (error) {
      await refundQuota(req);
      throw error;
    }

    // Enhancing writes to the shared recipes table, so only the owner of a
    // user-generated recipe may overwrite it. For anything else — seeded
    // library recipes, or another user's — save the result as a new recipe
    // owned by this caller instead of mutating the original.
    const canOverwrite = recipe.user_generated && recipe.created_by === userId;

    if (canOverwrite) {
      const { data: updated, error: updateError } = await supabase
        .from('recipes')
        .update({ ...enhancement, enhanced_at: new Date().toISOString() })
        .eq('id', recipe_id)
        .select()
        .single();

      if (updateError) throw updateError;
      return res.json(updated);
    }

    const { data: copy, error: copyError } = await supabase
      .from('recipes')
      .insert({
        ...toRecipeRow(recipe as Recipe, userId),
        ...enhancement,
        title: recipe.title,
        enhanced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (copyError) throw copyError;

    res.status(201).json(copy);
  };

  /** Suggests substitutions for a single ingredient, honoring dietary needs. */
  suggestSubstitutions = async (req: Request, res: Response) => {
    const userId = actingUserId(req);
    const { ingredient, reason } = req.body as { ingredient: string; reason?: string };

    const preferences = await loadPreferences(userId);
    const constraints = [
      ...(preferences?.dietary_restrictions ?? []),
      ...(preferences?.allergies ?? []),
    ];

    // Substitutions for a given ingredient are highly repeatable, so this is
    // the most valuable thing to cache.
    const cacheKey = usageService.cacheKey(
      'ingredient_substitute',
      userId,
      { ingredient, reason },
      preferences
    );
    const cached = await usageService.readCache<unknown>(cacheKey);
    if (cached) {
      await refundQuota(req);
      return res.json(cached);
    }

    let substitutions;
    try {
      substitutions = await aiService.suggestSubstitutions(ingredient, reason, constraints);
    } catch (error) {
      await refundQuota(req);
      throw error;
    }

    if (!substitutions || !Array.isArray(substitutions.substitutions)) {
      await refundQuota(req);
      throw upstreamFailure('The model returned an unusable response. Please try again.');
    }

    await usageService.writeCache(cacheKey, userId, 'ingredient_substitute', substitutions);

    res.json(substitutions);
  };
}
