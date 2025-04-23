import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { UserPreferences } from '../types';

export class UserPreferencesController {
  async getUserPreferences(req: Request, res: Response) {
    try {
      const { user_id } = req.params;
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user_id)
        .single();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: 'User preferences not found' });
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user preferences' });
    }
  }

  async updateUserPreferences(req: Request, res: Response) {
    try {
      const { user_id } = req.params;
      const preferences: Partial<UserPreferences> = req.body;

      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          ...preferences,
          user_id,
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;
      res.json(data[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user preferences' });
    }
  }
} 