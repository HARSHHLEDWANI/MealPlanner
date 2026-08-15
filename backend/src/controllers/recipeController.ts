import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { actingUserId } from '../middleware/auth';
import { notFound } from '../lib/errors';

export class RecipeController {
  /**
   * Recipes are a shared library: any signed-in user can read any recipe.
   * Paginated — this previously selected the entire table on every call.
   */
  getAllRecipes = async (req: Request, res: Response) => {
    const { limit, offset, search } = req.query as unknown as {
      limit: number;
      offset: number;
      search?: string;
    };

    let query = supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data ?? []);
  };

  getRecipeById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw notFound('Recipe');

    res.json(data);
  };

  /**
   * The recipes this user has saved.
   *
   * The route for this never existed, so the frontend's GET /api/recipes/saved
   * fell through to GET /:id and looked up a recipe with the literal ID
   * "saved".
   */
  getSavedRecipes = async (req: Request, res: Response) => {
    const userId = actingUserId(req);

    const { data, error } = await supabase
      .from('saved_recipes')
      .select('recipe:recipes(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Unwrap the join so the client receives a plain Recipe[].
    res.json((data ?? []).map((row: { recipe: unknown }) => row.recipe).filter(Boolean));
  };

  searchRecipes = async (req: Request, res: Response) => {
    const { query } = req.body as { query: string };

    // ilike rather than textSearch: the column has no tsvector index, and
    // textSearch rejects ordinary multi-word input as a malformed tsquery.
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .ilike('title', `%${query}%`)
      .limit(50);

    if (error) throw error;

    res.json(data ?? []);
  };

  saveRecipe = async (req: Request, res: Response) => {
    const userId = actingUserId(req);
    const { id } = req.params;

    const { data: recipe, error: lookupError } = await supabase
      .from('recipes')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!recipe) throw notFound('Recipe');

    // Idempotent: saving twice is a no-op rather than a unique-constraint 500.
    const { error } = await supabase
      .from('saved_recipes')
      .upsert({ user_id: userId, recipe_id: id }, { onConflict: 'user_id,recipe_id' });

    if (error) throw error;

    res.json({ message: 'Recipe saved successfully' });
  };

  unsaveRecipe = async (req: Request, res: Response) => {
    const userId = actingUserId(req);
    const { id } = req.params;

    const { error } = await supabase
      .from('saved_recipes')
      .delete()
      .match({ user_id: userId, recipe_id: id });

    if (error) throw error;

    res.json({ message: 'Recipe unsaved successfully' });
  };
}
