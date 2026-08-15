import { z } from 'zod';

/**
 * Request schemas. Every route validates its params and body against one of
 * these before a controller sees the request.
 *
 * Note what is absent: no schema accepts a `user_id` in a body or param as the
 * acting user. That identity comes from the verified token only.
 */

const uuid = z.string().uuid('must be a valid UUID');

/**
 * ISO calendar date, e.g. 2026-08-17.
 *
 * Round-trips through Date rather than just checking Date.parse succeeds:
 * Date.parse('2026-02-31') does not fail, it silently rolls over to March 3.
 * Comparing the formatted result back to the input rejects dates that do not
 * exist.
 */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a date in YYYY-MM-DD form')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'must be a real calendar date');

const shortText = z.string().trim().min(1).max(200);

/** Free-text sent to the LLM. Capped so a caller cannot inflate token spend. */
const promptText = z.string().trim().min(1, 'cannot be empty').max(500);

// ---------------------------------------------------------------- path params

export const idParam = z.object({ id: uuid });
export const recipeIdParam = z.object({ recipe_id: uuid });
export const mealPlanIdParam = z.object({ meal_plan_id: uuid });
export const userIdParam = z.object({ user_id: uuid });
export const listItemParams = z.object({ list_id: uuid, item_id: uuid });

// -------------------------------------------------------------------- recipes

export const searchRecipesBody = z.object({
  query: promptText,
});

export const generateRecipesBody = z.object({
  ingredients: z.array(shortText).min(1, 'provide at least one ingredient').max(30),
});

export const listRecipesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(200).optional(),
});

// ---------------------------------------------------------------- preferences

export const updatePreferencesBody = z.object({
  dietary_restrictions: z.array(shortText).max(20).optional(),
  allergies: z.array(shortText).max(20).optional(),
  preferred_cuisines: z.array(shortText).max(20).optional(),
  cooking_skill_level: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
  serving_size: z.number().int().min(1).max(20).optional(),
});

// ----------------------------------------------------------------- meal plans

const mealPlanItem = z.object({
  recipe_id: uuid,
  day_of_week: z.number().int().min(0).max(6),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  servings: z.number().int().min(1).max(20).default(1),
});

export const createMealPlanBody = z.object({
  week_start_date: isoDate,
  meals: z.array(mealPlanItem).max(28).default([]),
});

export const updateMealPlanBody = z.object({
  meals: z.array(mealPlanItem).max(28),
});

// -------------------------------------------------------------- shopping list

const shoppingListItem = z.object({
  ingredient: shortText,
  quantity: z.number().min(0).max(1000).default(1),
  unit: z.string().trim().max(30).default('unit'),
  category: z
    .enum(['Produce', 'Meat', 'Dairy', 'Pantry', 'Frozen', 'Other'])
    .default('Other'),
  is_checked: z.boolean().default(false),
});

export const createShoppingListBody = z.object({
  name: shortText,
  meal_plan_id: uuid.optional(),
  items: z.array(shoppingListItem).max(200).default([]),
});

export const updateShoppingListBody = z
  .object({
    name: shortText.optional(),
    items: z.array(shoppingListItem).max(200).optional(),
  })
  .refine((v) => v.name !== undefined || v.items !== undefined, {
    message: 'provide at least one of name or items',
  });

export const toggleItemBody = z.object({
  is_checked: z.boolean(),
});

// ------------------------------------------------------------------------- ai

export const aiGenerateRecipeBody = z.object({
  query: promptText,
  cuisine: shortText.optional(),
});

export const aiMealPlanBody = z.object({
  week_start_date: isoDate,
});

export const aiSubstituteBody = z.object({
  ingredient: shortText,
  reason: z.string().trim().max(300).optional(),
});

export const aiAnalyzeImageBody = z.object({
  /** Data URL or bare base64. Size is bounded to keep a huge upload from
   *  reaching the model — roughly 8MB of base64. */
  image: z.string().min(32).max(8 * 1024 * 1024),
});
