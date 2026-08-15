import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

/**
 * Controller happy paths, plus the ownership boundaries that protect them.
 *
 * Because the API connects with a service-role key that bypasses row-level
 * security, a missing ownership check does not fail loudly — it quietly
 * returns someone else's data. Those cases are asserted alongside the happy
 * paths rather than treated as an extra.
 */

const getUser = vi.fn();
const from = vi.fn();
const rpc = vi.fn();
const generateContent = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: (token: string) => getUser(token) },
    from: (table: string) => from(table),
    rpc: (fn: string, args: unknown) => rpc(fn, args),
  },
}));

vi.mock('../lib/gemini', () => ({
  model: { generateContent: (...args: unknown[]) => generateContent(...args) },
  genAI: {},
}));

const { createApp } = await import('../app');
const app = createApp({ rateLimiting: false });

const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'cook@example.com' };
const OTHER_USER = '99999999-9999-4999-8999-999999999999';
const RECIPE_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const PLAN_ID = 'bbbbbbbb-1111-4111-8111-111111111111';
const LIST_ID = 'cccccccc-1111-4111-8111-111111111111';

const auth = (req: request.Test) => req.set('Authorization', 'Bearer valid-token');

/**
 * Builds a chainable Supabase query stub.
 *
 * `result` may be a function so a table can answer differently per call — used
 * to distinguish an ownership lookup from the query that follows it.
 */
function stubTable(result: unknown | (() => unknown)) {
  const resolve = () => (typeof result === 'function' ? (result as () => unknown)() : result);
  const builder: Record<string, any> = {};
  const chain = () => builder;
  for (const m of [
    'select', 'insert', 'update', 'delete', 'upsert', 'eq', 'gte', 'gt',
    'order', 'limit', 'range', 'match', 'ilike', 'in',
  ]) {
    builder[m] = chain;
  }
  builder.single = async () => resolve();
  builder.maybeSingle = async () => resolve();
  builder.then = (r: (v: unknown) => unknown) => r(resolve());
  return builder;
}

const ok = (data: unknown) => ({ data, error: null });

const RECIPE = {
  id: RECIPE_ID,
  title: 'Pasta Primavera',
  description: 'Fresh and quick.',
  ingredients: ['2 tbsp olive oil', '1 cup cherry tomatoes'],
  instructions: ['Heat oil.', 'Add tomatoes.'],
  prep_time: 15,
  cook_time: 20,
  servings: 4,
  difficulty: 'Easy',
  cuisine_type: 'Italian',
  dietary_tags: ['vegetarian'],
  user_generated: false,
  created_by: null,
  created_at: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: USER }, error: null });
  rpc.mockResolvedValue({ data: [{ allowed: true, used: 1, quota: 10 }], error: null });
});

describe('recipes', () => {
  it('lists recipes', async () => {
    from.mockReturnValue(stubTable(ok([RECIPE])));

    const res = await auth(request(app).get('/api/recipes'));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Pasta Primavera');
  });

  it('returns 404 for a recipe that does not exist', async () => {
    from.mockReturnValue(stubTable(ok(null)));

    const res = await auth(request(app).get(`/api/recipes/${RECIPE_ID}`));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('serves saved recipes from its own route, not /:id', async () => {
    // The frontend called GET /api/recipes/saved when no such route existed,
    // so it fell through to /:id and looked up a recipe with the literal ID
    // "saved". The literal path must win.
    from.mockReturnValue(stubTable(ok([{ recipe: RECIPE }])));

    const res = await auth(request(app).get('/api/recipes/saved'));

    expect(res.status).toBe(200);
    expect(from).toHaveBeenCalledWith('saved_recipes');
    expect(res.body[0].title).toBe('Pasta Primavera');
  });

  it('saves a recipe against the token holder', async () => {
    const upserts: Array<Record<string, unknown>> = [];
    from.mockImplementation((table: string) => {
      if (table === 'recipes') return stubTable(ok({ id: RECIPE_ID }));
      const builder = stubTable(ok(null));
      builder.upsert = (payload: Record<string, unknown>) => {
        upserts.push(payload);
        return builder;
      };
      return builder;
    });

    const res = await auth(request(app).post(`/api/recipes/save/${RECIPE_ID}`)).send({
      user_id: OTHER_USER, // ignored
    });

    expect(res.status).toBe(200);
    expect(upserts[0]).toMatchObject({ user_id: USER.id, recipe_id: RECIPE_ID });
  });

  it('rejects a non-UUID recipe id with 400, not 500', async () => {
    const res = await auth(request(app).get('/api/recipes/not-a-uuid'));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.details[0].path).toBe('id');
  });
});

describe('preferences', () => {
  it('returns defaults when a user has none stored', async () => {
    // Previously this 404'd, which made the preference lookup an error path
    // for every new user's first AI request.
    from.mockReturnValue(stubTable(ok(null)));

    const res = await auth(request(app).get('/api/preferences'));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      user_id: USER.id,
      cooking_skill_level: 'Intermediate',
      serving_size: 2,
      allergies: [],
    });
  });

  it('rejects an invalid skill level', async () => {
    const res = await auth(request(app).put('/api/preferences')).send({
      cooking_skill_level: 'Wizard',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('cooking_skill_level');
  });
});

describe('meal plans', () => {
  it('returns the current plan', async () => {
    from.mockReturnValue(stubTable(ok({ id: PLAN_ID, user_id: USER.id, meals: [] })));

    const res = await auth(request(app).get('/api/meal-plans/current'));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(PLAN_ID);
  });

  it('reports 404 rather than an empty plan when none exists', async () => {
    from.mockReturnValue(stubTable(ok(null)));

    const res = await auth(request(app).get('/api/meal-plans/current'));

    expect(res.status).toBe(404);
  });

  it('refuses to update a plan belonging to someone else', async () => {
    from.mockReturnValue(stubTable(ok({ user_id: OTHER_USER })));

    const res = await auth(request(app).put(`/api/meal-plans/${PLAN_ID}`)).send({ meals: [] });

    // 404 not 403: confirming the ID exists would itself disclose something.
    expect(res.status).toBe(404);
  });

  it('refuses to delete a plan belonging to someone else', async () => {
    from.mockReturnValue(stubTable(ok({ user_id: OTHER_USER })));

    const res = await auth(request(app).delete(`/api/meal-plans/${PLAN_ID}`));

    expect(res.status).toBe(404);
  });

  it('rejects an impossible date', async () => {
    // Date.parse('2026-02-31') does not fail; it rolls over to March 3.
    const res = await auth(request(app).post('/api/meal-plans')).send({
      week_start_date: '2026-02-31',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('week_start_date');
  });

  it('rejects an out-of-range day_of_week', async () => {
    const res = await auth(request(app).post('/api/meal-plans')).send({
      week_start_date: '2026-08-16',
      meals: [{ recipe_id: RECIPE_ID, day_of_week: 9, meal_type: 'brunch', servings: 2 }],
    });

    expect(res.status).toBe(400);
  });
});

describe('shopping lists', () => {
  it('lists the caller lists', async () => {
    from.mockReturnValue(stubTable(ok([{ id: LIST_ID, name: 'Weekly', items: [] }])));

    const res = await auth(request(app).get('/api/shopping-lists'));

    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe('Weekly');
  });

  it("refuses to link a list to another user's meal plan", async () => {
    from.mockReturnValue(stubTable(ok({ user_id: OTHER_USER })));

    const res = await auth(request(app).post('/api/shopping-lists')).send({
      name: 'Sneaky',
      meal_plan_id: PLAN_ID,
      items: [],
    });

    expect(res.status).toBe(404);
  });

  it("refuses to generate from another user's meal plan", async () => {
    from.mockReturnValue(stubTable(ok({ user_id: OTHER_USER })));

    const res = await auth(request(app).post(`/api/shopping-lists/generate/${PLAN_ID}`));

    expect(res.status).toBe(404);
  });
});

describe('AI routes', () => {
  it('reports usage without consuming quota', async () => {
    from.mockReturnValue(stubTable(ok([{ calls: 3 }])));

    const res = await auth(request(app).get('/api/ai/usage'));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ used: 3, quota: 10, remaining: 7 });
    // Checking the balance must not spend from it.
    expect(rpc).not.toHaveBeenCalledWith('consume_ai_quota', expect.anything());
  });

  it('generates a recipe and saves it to the caller', async () => {
    generateContent.mockResolvedValue({
      response: {
        text: () =>
          '```json\n' +
          JSON.stringify({
            title: 'Test Curry',
            description: 'Warming.',
            ingredients: ['1 tbsp oil'],
            instructions: ['Cook it.'],
            prep_time: 10,
            cook_time: 20,
            servings: 2,
            difficulty: 'Easy',
            cuisine_type: 'Indian',
            dietary_tags: ['vegan'],
          }) +
          '\n```',
      },
    });

    const inserts: Array<Record<string, unknown>> = [];
    from.mockImplementation((table: string) => {
      if (table === 'ai_response_cache') return stubTable(ok(null));
      if (table === 'user_preferences') return stubTable(ok(null));
      const builder = stubTable(ok({ ...RECIPE, id: 'new-id', title: 'Test Curry' }));
      builder.insert = (payload: Record<string, unknown>) => {
        inserts.push(payload);
        return builder;
      };
      return builder;
    });

    const res = await auth(request(app).post('/api/ai/recipe/generate')).send({
      query: 'a warming curry',
    });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Curry');
    // Attribution comes from the token, and quota was consumed.
    expect(inserts[0]).toMatchObject({ created_by: USER.id, user_generated: true });
    expect(rpc).toHaveBeenCalledWith('consume_ai_quota', expect.objectContaining({
      p_user_id: USER.id,
    }));
  });

  it('parses a fenced JSON response from the model', async () => {
    // Gemini wraps JSON in markdown fences regardless of instructions; the
    // layered extraction exists for exactly this.
    generateContent.mockResolvedValue({
      response: {
        text: () =>
          'Here you go!\n```json\n{"substitutions":[{"ingredient":"maple syrup","ratio":"1:1"}]}\n```',
      },
    });
    from.mockReturnValue(stubTable(ok(null)));

    const res = await auth(request(app).post('/api/ai/ingredients/substitute')).send({
      ingredient: 'honey',
    });

    expect(res.status).toBe(200);
    expect(res.body.substitutions[0].ingredient).toBe('maple syrup');
  });

  it('returns 429 QUOTA_EXCEEDED when the daily allowance is gone', async () => {
    rpc.mockResolvedValue({ data: [{ allowed: false, used: 10, quota: 10 }], error: null });
    from.mockReturnValue(stubTable(ok(null)));

    const res = await auth(request(app).post('/api/ai/recipe/generate')).send({ query: 'x' });

    expect(res.status).toBe(429);
    // Distinct from RATE_LIMITED: this one resets tomorrow, not in minutes.
    expect(res.body.error.code).toBe('QUOTA_EXCEEDED');
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('validates before consuming quota', async () => {
    const res = await auth(request(app).post('/api/ai/recipe/generate')).send({ query: '' });

    expect(res.status).toBe(400);
    // A malformed request must not cost the user part of their allowance.
    expect(rpc).not.toHaveBeenCalled();
  });

  it('caps prompt length so a caller cannot inflate token spend', async () => {
    const res = await auth(request(app).post('/api/ai/recipe/generate')).send({
      query: 'x'.repeat(5000),
    });

    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('does not surface raw model failures to the client', async () => {
    generateContent.mockRejectedValue(new Error('gemini 500: internal at /srv/app/keys.js'));
    from.mockReturnValue(stubTable(ok(null)));

    const res = await auth(request(app).post('/api/ai/recipe/generate')).send({ query: 'x' });

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(JSON.stringify(res.body)).not.toMatch(/srv\/app|keys\.js/);
    // The reservation is handed back, since the call produced nothing.
    expect(rpc).toHaveBeenCalledWith('refund_ai_quota', expect.anything());
  });
});

describe('image analysis', () => {
  it('rejects a payload that is not an image data URL', async () => {
    from.mockReturnValue(stubTable(ok(null)));

    const res = await auth(request(app).post('/api/images/analyze')).send({
      image: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    });

    expect(res.status).toBe(400);
  });

  it('returns normalized ingredients', async () => {
    generateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            ingredients: [
              { name: '  Tomato ', confidence: 'high', quantity: '3' },
              { name: 'Onion', confidence: 'nonsense' },
              { name: '', confidence: 'high' },
            ],
          }),
      },
    });
    from.mockReturnValue(stubTable(ok(null)));

    const res = await auth(request(app).post('/api/images/analyze')).send({
      image: `data:image/jpeg;base64,${'A'.repeat(64)}`,
    });

    expect(res.status).toBe(200);
    // Trimmed, lowercased, bad confidence defaulted, empty name dropped.
    expect(res.body.ingredients).toEqual([
      { name: 'tomato', confidence: 'high', quantity: '3' },
      { name: 'onion', confidence: 'medium', quantity: undefined },
    ]);
  });
});

describe('error handling', () => {
  it('turns malformed JSON into a 400', async () => {
    const res = await auth(
      request(app).post('/api/recipes/search').set('Content-Type', 'application/json')
    ).send('{"query": broken');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MALFORMED_JSON');
  });

  it('never returns a raw database error', async () => {
    from.mockReturnValue(
      stubTable({
        data: null,
        error: { message: 'relation "recipes" does not exist', hint: 'schema public' },
      })
    );

    const res = await auth(request(app).get('/api/recipes'));

    expect(res.status).toBe(500);
    expect(res.body.error).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  });

  it('404s an unknown route in the JSON envelope', async () => {
    const res = await auth(request(app).get('/api/does-not-exist'));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
