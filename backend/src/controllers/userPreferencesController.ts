import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { actingUserId } from '../middleware/auth';
import { UserPreferences } from '../types';

/** Sensible defaults so a user who has never set preferences still gets a row. */
const DEFAULT_PREFERENCES = {
  dietary_restrictions: [] as string[],
  allergies: [] as string[],
  preferred_cuisines: [] as string[],
  cooking_skill_level: 'Intermediate' as const,
  serving_size: 2,
};

export class UserPreferencesController {
  /**
   * Returns the caller's preferences, or the defaults if none are stored.
   *
   * Previously 404'd when unset, which made every AI call's preference lookup
   * an error path for new users.
   */
  getUserPreferences = async (req: Request, res: Response) => {
    const userId = actingUserId(req);

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    res.json(data ?? { user_id: userId, ...DEFAULT_PREFERENCES });
  };

  updateUserPreferences = async (req: Request, res: Response) => {
    const userId = actingUserId(req);
    const preferences = req.body as Partial<UserPreferences>;

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(
        { ...preferences, user_id: userId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  };
}
