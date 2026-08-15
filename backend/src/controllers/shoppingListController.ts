import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { actingUserId } from '../middleware/auth';
import {
  assertOwnsMealPlan,
  assertOwnsShoppingList,
  assertOwnsShoppingListItem,
} from '../lib/ownership';
import { notFound } from '../lib/errors';
import { ShoppingListItem } from '../types';

const LIST_WITH_ITEMS = `
  *,
  items:shopping_list_items(*)
`;

/**
 * Splits a free-text ingredient line like "2 tbsp olive oil" into parts.
 *
 * Recipes store ingredients as prose strings, so aggregating a shopping list
 * means parsing them. This handles the common "<qty> <unit> <name>" shape,
 * including fractions ("1/2 cup flour") and decimals, and falls back to
 * treating the whole line as a name when it does not match.
 *
 * Deliberately simple: it will not understand "a pinch of salt" or "2 cloves
 * garlic, minced". Those degrade to quantity 1 with the text preserved, which
 * is still usable on a shopping list.
 */
function parseIngredient(line: string): { name: string; quantity: number; unit: string } {
  const match = line
    .trim()
    .match(/^(\d+(?:\.\d+)?(?:\s*\/\s*\d+)?|\d+\s+\d+\/\d+)\s*([a-zA-Z]+\.?)?\s+(.*)$/);

  if (!match) {
    return { name: line.trim(), quantity: 1, unit: 'unit' };
  }

  const [, rawQty, rawUnit, rawName] = match;

  let quantity: number;
  if (rawQty.includes('/')) {
    const [whole, fraction] = rawQty.trim().split(/\s+/);
    if (fraction) {
      const [n, d] = fraction.split('/').map(Number);
      quantity = Number(whole) + (d ? n / d : 0);
    } else {
      const [n, d] = rawQty.split('/').map((p) => Number(p.trim()));
      quantity = d ? n / d : n;
    }
  } else {
    quantity = Number(rawQty);
  }

  return {
    name: rawName.trim() || line.trim(),
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    unit: rawUnit?.replace(/\.$/, '').toLowerCase() ?? 'unit',
  };
}

/** Rough pantry-aisle bucketing so the list groups sensibly in the UI. */
const CATEGORY_KEYWORDS: Array<[ShoppingListItem['category'], string[]]> = [
  ['Produce', ['tomato', 'onion', 'garlic', 'pepper', 'lettuce', 'spinach', 'carrot',
    'potato', 'lemon', 'lime', 'apple', 'banana', 'berry', 'berries', 'herb', 'basil',
    'cilantro', 'parsley', 'ginger', 'broccoli', 'cucumber', 'zucchini', 'avocado',
    'mushroom', 'celery', 'cabbage', 'squash', 'asparagus', 'cauliflower']],
  ['Meat', ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'sausage', 'fish',
    'salmon', 'tuna', 'shrimp', 'steak', 'mince']],
  ['Dairy', ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'egg', 'feta',
    'parmesan', 'mozzarella']],
  ['Frozen', ['frozen', 'ice cream', 'peas']],
  ['Pantry', ['flour', 'sugar', 'salt', 'oil', 'vinegar', 'rice', 'pasta', 'bean',
    'lentil', 'spice', 'sauce', 'stock', 'broth', 'can', 'canned', 'tinned', 'honey',
    'oat', 'bread', 'quinoa', 'chickpea', 'coconut milk', 'soy sauce', 'cornstarch']],
];

function categorize(name: string): ShoppingListItem['category'] {
  const lower = name.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => lower.includes(keyword))) return category;
  }
  return 'Other';
}

export class ShoppingListController {
  getShoppingLists = async (req: Request, res: Response) => {
    const userId = actingUserId(req);

    const { data, error } = await supabase
      .from('shopping_lists')
      .select(LIST_WITH_ITEMS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data ?? []);
  };

  createShoppingList = async (req: Request, res: Response) => {
    const userId = actingUserId(req);
    const { name, meal_plan_id, items } = req.body as {
      name: string;
      meal_plan_id?: string;
      items: ShoppingListItem[];
    };

    // Linking a list to someone else's meal plan would leak that plan's ID
    // into this user's data, so verify the reference before accepting it.
    if (meal_plan_id) {
      await assertOwnsMealPlan(meal_plan_id, userId);
    }

    const { data: list, error: listError } = await supabase
      .from('shopping_lists')
      .insert({
        user_id: userId,
        name,
        meal_plan_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (listError) throw listError;

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from('shopping_list_items').insert(
        items.map((item) => ({
          ingredient: item.ingredient,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          is_checked: item.is_checked,
          shopping_list_id: list.id,
          created_at: new Date().toISOString(),
        }))
      );

      if (itemsError) {
        await supabase.from('shopping_lists').delete().eq('id', list.id);
        throw itemsError;
      }
    }

    const { data: completeList, error: fetchError } = await supabase
      .from('shopping_lists')
      .select(LIST_WITH_ITEMS)
      .eq('id', list.id)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json(completeList);
  };

  updateShoppingList = async (req: Request, res: Response) => {
    const userId = actingUserId(req);
    const { id } = req.params;
    const { name, items } = req.body as { name?: string; items?: ShoppingListItem[] };

    await assertOwnsShoppingList(id, userId);

    const { error: updateError } = await supabase
      .from('shopping_lists')
      .update({ ...(name ? { name } : {}), updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) throw updateError;

    if (items) {
      const { error: deleteError } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('shopping_list_id', id);

      if (deleteError) throw deleteError;

      if (items.length > 0) {
        const { error: insertError } = await supabase.from('shopping_list_items').insert(
          items.map((item) => ({
            ingredient: item.ingredient,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            is_checked: item.is_checked,
            shopping_list_id: id,
            created_at: new Date().toISOString(),
          }))
        );

        if (insertError) throw insertError;
      }
    }

    const { data: updatedList, error: fetchError } = await supabase
      .from('shopping_lists')
      .select(LIST_WITH_ITEMS)
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    res.json(updatedList);
  };

  toggleItemCheck = async (req: Request, res: Response) => {
    const userId = actingUserId(req);
    const { list_id, item_id } = req.params;
    const { is_checked } = req.body as { is_checked: boolean };

    await assertOwnsShoppingListItem(list_id, item_id, userId);

    const { data, error } = await supabase
      .from('shopping_list_items')
      .update({ is_checked })
      .match({ id: item_id, shopping_list_id: list_id })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  };

  deleteShoppingList = async (req: Request, res: Response) => {
    const userId = actingUserId(req);
    const { id } = req.params;

    await assertOwnsShoppingList(id, userId);

    const { error } = await supabase.from('shopping_lists').delete().eq('id', id);
    if (error) throw error;

    res.json({ message: 'Shopping list deleted successfully' });
  };

  /**
   * Builds a shopping list by aggregating every ingredient across a meal plan.
   *
   * Quantities are parsed and summed per ingredient/unit pair. The previous
   * version counted how many times an exact ingredient *string* appeared and
   * used that count as the quantity, so "1 cup flour" and "2 cups flour" became
   * two separate entries each with quantity 1, and every unit was "unit".
   */
  generateFromMealPlan = async (req: Request, res: Response) => {
    const userId = actingUserId(req);
    const { meal_plan_id } = req.params;

    await assertOwnsMealPlan(meal_plan_id, userId);

    const { data: mealPlan, error: planError } = await supabase
      .from('meal_plans')
      .select(`*, meals:meal_plan_items(recipe:recipes(ingredients))`)
      .eq('id', meal_plan_id)
      .maybeSingle();

    if (planError) throw planError;
    if (!mealPlan) throw notFound('Meal plan');

    // Key on name + unit so "2 cups flour" and "1 cup flour" merge to 3 cups,
    // while "1 clove garlic" and "1 tsp garlic" stay distinct.
    const aggregated = new Map<string, { name: string; quantity: number; unit: string }>();

    type PlanMeal = { recipe: { ingredients: unknown } | null };

    for (const meal of (mealPlan.meals ?? []) as PlanMeal[]) {
      const raw = meal.recipe?.ingredients;
      if (!Array.isArray(raw)) continue;

      for (const entry of raw) {
        // The column holds both plain strings (AI-generated) and objects
        // (seeded library recipes), so normalize both shapes.
        const line =
          typeof entry === 'string'
            ? entry
            : entry && typeof entry === 'object'
              ? [
                  (entry as Record<string, unknown>).amount,
                  (entry as Record<string, unknown>).unit,
                  (entry as Record<string, unknown>).name,
                ]
                  .filter(Boolean)
                  .join(' ')
              : '';

        if (!line.trim()) continue;

        const parsed = parseIngredient(line);
        const key = `${parsed.name.toLowerCase()}|${parsed.unit}`;
        const existing = aggregated.get(key);

        if (existing) {
          existing.quantity += parsed.quantity;
        } else {
          aggregated.set(key, { ...parsed });
        }
      }
    }

    const items = Array.from(aggregated.values()).map((item) => ({
      ingredient: item.name,
      quantity: Math.round(item.quantity * 100) / 100,
      unit: item.unit,
      category: categorize(item.name),
      is_checked: false,
    }));

    const { data: list, error: createError } = await supabase
      .from('shopping_lists')
      .insert({
        user_id: userId,
        meal_plan_id,
        name: `Shopping List for Week of ${new Date(mealPlan.week_start_date).toLocaleDateString()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) throw createError;

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from('shopping_list_items').insert(
        items.map((item) => ({ ...item, shopping_list_id: list.id, created_at: new Date().toISOString() }))
      );

      if (itemsError) {
        await supabase.from('shopping_lists').delete().eq('id', list.id);
        throw itemsError;
      }
    }

    const { data: completeList, error: fetchError } = await supabase
      .from('shopping_lists')
      .select(LIST_WITH_ITEMS)
      .eq('id', list.id)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json(completeList);
  };
}
