import { supabase } from './supabase';
import { forbidden, notFound } from './errors';

/**
 * Ownership checks for routes addressed by resource ID rather than user ID.
 *
 * Because the API connects with the service-role key, row-level security never
 * applies to these queries — a bare `.eq('id', id)` will happily return or
 * delete another user's row. Every such route must pass through here first.
 *
 * A resource owned by someone else reports 404, not 403: telling an
 * unauthorized caller that an ID exists is itself a disclosure.
 */
async function assertOwns(
  table: 'meal_plans' | 'shopping_lists',
  id: string,
  userId: string,
  label: string
): Promise<void> {
  const { data, error } = await supabase
    .from(table)
    .select('user_id')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw notFound(label);
  if (data.user_id !== userId) throw notFound(label);
}

export const assertOwnsMealPlan = (id: string, userId: string) =>
  assertOwns('meal_plans', id, userId, 'Meal plan');

export const assertOwnsShoppingList = (id: string, userId: string) =>
  assertOwns('shopping_lists', id, userId, 'Shopping list');

/**
 * Shopping list items are owned transitively through their parent list.
 */
export async function assertOwnsShoppingListItem(
  listId: string,
  itemId: string,
  userId: string
): Promise<void> {
  await assertOwnsShoppingList(listId, userId);

  const { data, error } = await supabase
    .from('shopping_list_items')
    .select('id')
    .eq('id', itemId)
    .eq('shopping_list_id', listId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw notFound('Shopping list item');
}

/**
 * Recipes are shared library content, readable by any signed-in user. Only
 * mutation is restricted, and only to user-generated rows.
 */
export async function assertCanModifyRecipe(recipeId: string, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, created_by, user_generated')
    .eq('id', recipeId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw notFound('Recipe');

  // Seeded library recipes have no owner and are read-only for everyone.
  if (!data.user_generated) {
    throw forbidden('Library recipes cannot be modified');
  }
  if (data.created_by && data.created_by !== userId) {
    throw notFound('Recipe');
  }
}
