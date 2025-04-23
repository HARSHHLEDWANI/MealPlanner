import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { ShoppingList, ShoppingListItem } from '../types';

export class ShoppingListController {
  async getShoppingLists(req: Request, res: Response) {
    try {
      const { user_id } = req.params;
      const { data, error } = await supabase
        .from('shopping_lists')
        .select(`
          *,
          items:shopping_list_items(*)
        `)
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch shopping lists' });
    }
  }

  async createShoppingList(req: Request, res: Response) {
    try {
      const { user_id } = req.params;
      const { name, meal_plan_id, items }: ShoppingList = req.body;

      // Create shopping list
      const { data: list, error: listError } = await supabase
        .from('shopping_lists')
        .insert({
          user_id,
          name,
          meal_plan_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (listError) throw listError;

      // Add items to shopping list
      if (items && items.length > 0) {
        const listItems = items.map(item => ({
          ...item,
          shopping_list_id: list.id,
          created_at: new Date().toISOString()
        }));

        const { error: itemsError } = await supabase
          .from('shopping_list_items')
          .insert(listItems);

        if (itemsError) throw itemsError;
      }

      // Fetch complete shopping list with items
      const { data: completeList, error: fetchError } = await supabase
        .from('shopping_lists')
        .select(`
          *,
          items:shopping_list_items(*)
        `)
        .eq('id', list.id)
        .single();

      if (fetchError) throw fetchError;
      res.json(completeList);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create shopping list' });
    }
  }

  async updateShoppingList(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, items }: { name?: string; items: ShoppingListItem[] } = req.body;

      // Update shopping list name if provided
      if (name) {
        const { error: updateError } = await supabase
          .from('shopping_lists')
          .update({
            name,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) throw updateError;
      }

      // Update items if provided
      if (items) {
        // Delete existing items
        const { error: deleteError } = await supabase
          .from('shopping_list_items')
          .delete()
          .eq('shopping_list_id', id);

        if (deleteError) throw deleteError;

        // Insert new items
        const { error: insertError } = await supabase
          .from('shopping_list_items')
          .insert(
            items.map(item => ({
              ...item,
              shopping_list_id: id,
              created_at: new Date().toISOString()
            }))
          );

        if (insertError) throw insertError;
      }

      // Fetch updated shopping list
      const { data: updatedList, error: fetchError } = await supabase
        .from('shopping_lists')
        .select(`
          *,
          items:shopping_list_items(*)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      res.json(updatedList);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update shopping list' });
    }
  }

  async toggleItemCheck(req: Request, res: Response) {
    try {
      const { list_id, item_id } = req.params;
      const { is_checked } = req.body;

      const { data, error } = await supabase
        .from('shopping_list_items')
        .update({ is_checked })
        .match({ id: item_id, shopping_list_id: list_id })
        .select();

      if (error) throw error;
      res.json(data[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update item status' });
    }
  }

  async deleteShoppingList(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.json({ message: 'Shopping list deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete shopping list' });
    }
  }

  async generateFromMealPlan(req: Request, res: Response) {
    try {
      const { meal_plan_id } = req.params;
      
      // Fetch meal plan with recipes
      const { data: mealPlan, error: mealPlanError } = await supabase
        .from('meal_plans')
        .select(`
          *,
          meals:meal_plan_items(
            *,
            recipe:recipes(
              ingredients
            )
          )
        `)
        .eq('id', meal_plan_id)
        .single();

      if (mealPlanError) throw mealPlanError;

      // Aggregate ingredients from all recipes
      const ingredients = new Map<string, number>();
      mealPlan.meals.forEach((meal: { recipe: { ingredients: string[] } }) => {
        meal.recipe.ingredients.forEach((ingredient: string) => {
          if (ingredients.has(ingredient)) {
            ingredients.set(ingredient, ingredients.get(ingredient)! + 1);
          } else {
            ingredients.set(ingredient, 1);
          }
        });
      });

      // Create shopping list items
      const items: Partial<ShoppingListItem>[] = Array.from(ingredients.entries()).map(([ingredient, count]) => ({
        ingredient,
        quantity: count,
        unit: 'unit', // This would need to be parsed from the ingredient string
        category: 'Other', // This would need to be determined by ingredient type
        is_checked: false
      }));

      // Create shopping list
      const { data: list, error: createError } = await supabase
        .from('shopping_lists')
        .insert({
          user_id: mealPlan.user_id,
          meal_plan_id,
          name: `Shopping List for Week of ${new Date(mealPlan.week_start_date).toLocaleDateString()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;

      // Add items to shopping list
      const { error: itemsError } = await supabase
        .from('shopping_list_items')
        .insert(
          items.map(item => ({
            ...item,
            shopping_list_id: list.id,
            created_at: new Date().toISOString()
          }))
        );

      if (itemsError) throw itemsError;

      // Fetch complete shopping list
      const { data: completeList, error: fetchError } = await supabase
        .from('shopping_lists')
        .select(`
          *,
          items:shopping_list_items(*)
        `)
        .eq('id', list.id)
        .single();

      if (fetchError) throw fetchError;
      res.json(completeList);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate shopping list from meal plan' });
    }
  }
} 