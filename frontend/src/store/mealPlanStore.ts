import { create } from 'zustand';
import { MealPlan, Recipe } from '../types';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface MealPlanState {
  mealPlans: MealPlan[];
  currentMealPlan: MealPlan | null;
  loading: boolean;
  error: string | null;
  fetchMealPlans: () => Promise<void>;
  getCurrentMealPlan: () => Promise<void>;
  addRecipeToMealPlan: (recipe: Recipe, date: string, mealType: string) => Promise<void>;
  removeRecipeFromMealPlan: (date: string, mealType: string) => Promise<void>;
  createNewMealPlan: () => Promise<void>;
}

export const useMealPlanStore = create<MealPlanState>((set, get) => ({
  mealPlans: [],
  currentMealPlan: null,
  loading: false,
  error: null,

  fetchMealPlans: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .order('week_start', { ascending: false });

      if (error) throw error;
      
      // Parse the days JSON from the database
      const parsedMealPlans = (data || []).map(plan => ({
        id: plan.id,
        userId: plan.user_id,
        weekStart: plan.week_start,
        days: JSON.parse(plan.days)
      }));
      
      set({ mealPlans: parsedMealPlans as MealPlan[], loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch meal plans', 
        loading: false 
      });
    }
  },

  getCurrentMealPlan: async () => {
    set({ loading: true });
    try {
      // Get current week's start date (Sunday)
      const today = new Date();
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay()); // Set to Sunday
      currentWeekStart.setHours(0, 0, 0, 0);
      
      const weekStartStr = currentWeekStart.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('week_start', weekStartStr)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows returned"
        throw error;
      }
      
      if (data) {
        set({ 
          currentMealPlan: {
            id: data.id,
            userId: data.user_id,
            weekStart: data.week_start,
            days: JSON.parse(data.days)
          } as MealPlan, 
          loading: false 
        });
      } else {
        // No meal plan for current week, create a new one
        await get().createNewMealPlan();
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to get current meal plan', 
        loading: false 
      });
    }
  },

  addRecipeToMealPlan: async (recipe: Recipe, date: string, mealType: string) => {
    try {
      const { currentMealPlan } = get();
      if (!currentMealPlan) return;
      
      // Find the day to update
      const updatedDays = [...currentMealPlan.days];
      const dayIndex = updatedDays.findIndex(day => day.date === date);
      
      if (dayIndex === -1) return;
      
      // Update the meal
      if (mealType === 'snacks') {
        // For snacks, we maintain an array
        updatedDays[dayIndex].meals.snacks = [
          ...(updatedDays[dayIndex].meals.snacks || []),
          recipe
        ];
      } else {
        // For main meals, we replace the existing meal
        updatedDays[dayIndex].meals = {
          ...updatedDays[dayIndex].meals,
          [mealType]: recipe
        };
      }
      
      // Update the database
      const { error } = await supabase
        .from('meal_plans')
        .update({ days: JSON.stringify(updatedDays) })
        .eq('id', currentMealPlan.id);

      if (error) throw error;
      
      // Update local state
      set({
        currentMealPlan: {
          ...currentMealPlan,
          days: updatedDays
        }
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add recipe to meal plan' 
      });
    }
  },

  removeRecipeFromMealPlan: async (date: string, mealType: string) => {
    try {
      const { currentMealPlan } = get();
      if (!currentMealPlan) return;
      
      // Find the day to update
      const updatedDays = [...currentMealPlan.days];
      const dayIndex = updatedDays.findIndex(day => day.date === date);
      
      if (dayIndex === -1) return;
      
      // Update the meal
      if (mealType === 'snacks') {
        // For snacks, we clear the array
        updatedDays[dayIndex].meals.snacks = [];
      } else {
        // For main meals, we set to null
        updatedDays[dayIndex].meals = {
          ...updatedDays[dayIndex].meals,
          [mealType]: null
        };
      }
      
      // Update the database
      const { error } = await supabase
        .from('meal_plans')
        .update({ days: JSON.stringify(updatedDays) })
        .eq('id', currentMealPlan.id);

      if (error) throw error;
      
      // Update local state
      set({
        currentMealPlan: {
          ...currentMealPlan,
          days: updatedDays
        }
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to remove recipe from meal plan' 
      });
    }
  },

  createNewMealPlan: async () => {
    set({ loading: true });
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      // Get current week's start date (Sunday)
      const today = new Date();
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay()); // Set to Sunday
      currentWeekStart.setHours(0, 0, 0, 0);
      
      // Create 7 days for the week
      const days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + i);
        return {
          date: date.toISOString().split('T')[0],
          meals: {
            breakfast: null,
            lunch: null,
            dinner: null,
            snacks: []
          }
        };
      });
      
      // Insert into database
      const weekStartStr = currentWeekStart.toISOString().split('T')[0];
      const newMealPlanId = uuidv4();
      
      const { error } = await supabase
        .from('meal_plans')
        .insert({
          id: newMealPlanId,
          user_id: userId,
          week_start: weekStartStr,
          days: JSON.stringify(days)
        });

      if (error) throw error;
      
      // Update local state
      const newMealPlan = {
        id: newMealPlanId,
        userId,
        weekStart: weekStartStr,
        days
      };
      
      set({
        mealPlans: [newMealPlan, ...get().mealPlans],
        currentMealPlan: newMealPlan,
        loading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create new meal plan', 
        loading: false 
      });
    }
  }
}));