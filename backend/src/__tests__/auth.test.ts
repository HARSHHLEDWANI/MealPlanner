import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

/**
 * Authentication tests.
 *
 * This is the suite that matters most: before this work every route trusted a
 * user_id taken from the URL while the server held a service-role key that
 * bypasses row-level security, so any anonymous caller could read or mutate
 * anyone's data. A regression here is a full data breach, not a bug — so the
 * assertions cover every route group, not a representative sample.
 */

const getUser = vi.fn();
const from = vi.fn();
const rpc = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: (token: string) => getUser(token) },
    from: (...args: unknown[]) => from(...args),
    rpc: (...args: unknown[]) => rpc(...args),
  },
}));

vi.mock('../lib/gemini', () => ({
  model: { generateContent: vi.fn() },
  genAI: {},
}));

const { createApp } = await import('../app');
const app = createApp({ rateLimiting: false });

const VALID_USER = { id: '11111111-1111-4111-8111-111111111111', email: 'cook@example.com' };

/** Minimal chainable stub of the Supabase query builder. */
function queryResult(data: unknown, error: unknown = null) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  for (const method of [
    'select', 'insert', 'update', 'delete', 'upsert', 'eq', 'gte', 'gt', 'lt',
    'order', 'limit', 'range', 'match', 'ilike', 'in', 'textSearch',
  ]) {
    builder[method] = chain;
  }
  builder.single = async () => ({ data, error });
  builder.maybeSingle = async () => ({ data, error });
  builder.then = (resolve: (value: unknown) => unknown) => resolve({ data, error });
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  from.mockReturnValue(queryResult([]));
  rpc.mockResolvedValue({ data: [{ allowed: true, used: 1, quota: 10 }], error: null });
});

/** Every route that touches user data. */
const PROTECTED = [
  ['get', '/api/recipes'],
  ['get', '/api/recipes/saved'],
  ['get', '/api/recipes/11111111-1111-4111-8111-111111111111'],
  ['post', '/api/recipes/search'],
  ['post', '/api/recipes/save/11111111-1111-4111-8111-111111111111'],
  ['delete', '/api/recipes/save/11111111-1111-4111-8111-111111111111'],
  ['get', '/api/preferences'],
  ['put', '/api/preferences'],
  ['get', '/api/meal-plans/current'],
  ['post', '/api/meal-plans'],
  ['put', '/api/meal-plans/11111111-1111-4111-8111-111111111111'],
  ['delete', '/api/meal-plans/11111111-1111-4111-8111-111111111111'],
  ['get', '/api/shopping-lists'],
  ['post', '/api/shopping-lists'],
  ['put', '/api/shopping-lists/11111111-1111-4111-8111-111111111111'],
  ['delete', '/api/shopping-lists/11111111-1111-4111-8111-111111111111'],
  ['put', '/api/shopping-lists/11111111-1111-4111-8111-111111111111/items/22222222-2222-4222-8222-222222222222'],
  ['post', '/api/shopping-lists/generate/11111111-1111-4111-8111-111111111111'],
  ['get', '/api/ai/usage'],
  ['post', '/api/ai/recipe/generate'],
  ['post', '/api/ai/meal-plan/generate'],
  ['post', '/api/ai/recipe/enhance/11111111-1111-4111-8111-111111111111'],
  ['post', '/api/ai/ingredients/substitute'],
  ['post', '/api/images/analyze'],
] as const;

describe('authentication', () => {
  describe('rejects unauthenticated requests', () => {
    it.each(PROTECTED)('%s %s returns 401 with no token', async (method, path) => {
      const res = await (request(app) as any)[method](path);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      // The token is never verified, so Supabase is never consulted.
      expect(getUser).not.toHaveBeenCalled();
    });

    it('rejects a malformed Authorization header', async () => {
      const res = await request(app).get('/api/recipes').set('Authorization', 'Basic abc123');

      expect(res.status).toBe(401);
      expect(getUser).not.toHaveBeenCalled();
    });

    it('rejects an empty bearer token', async () => {
      const res = await request(app).get('/api/recipes').set('Authorization', 'Bearer ');

      expect(res.status).toBe(401);
      expect(getUser).not.toHaveBeenCalled();
    });

    it('rejects a token Supabase does not recognize', async () => {
      getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });

      const res = await request(app).get('/api/recipes').set('Authorization', 'Bearer forged');

      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/invalid or expired/i);
      expect(getUser).toHaveBeenCalledWith('forged');
    });

    it('does not leak internals when Supabase itself fails', async () => {
      getUser.mockRejectedValue(new Error('ECONNREFUSED 10.0.0.5:5432'));

      const res = await request(app).get('/api/recipes').set('Authorization', 'Bearer whatever');

      // A transport failure is our fault, not a bad credential.
      expect(res.status).toBe(500);
      expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED|10\.0\.0\.5/);
    });
  });

  describe('accepts authenticated requests', () => {
    beforeEach(() => {
      getUser.mockResolvedValue({ data: { user: VALID_USER }, error: null });
    });

    it('allows a request carrying a valid token', async () => {
      const res = await request(app).get('/api/recipes').set('Authorization', 'Bearer good-token');

      expect(res.status).toBe(200);
      expect(getUser).toHaveBeenCalledWith('good-token');
    });

    it('derives the user from the token, never from the request body', async () => {
      const captured: Array<Record<string, unknown>> = [];
      from.mockImplementation(() => {
        const builder = queryResult({ user_id: VALID_USER.id }) as Record<string, unknown>;
        builder.upsert = (payload: Record<string, unknown>) => {
          captured.push(payload);
          return builder;
        };
        return builder;
      });

      await request(app)
        .put('/api/preferences')
        .set('Authorization', 'Bearer good-token')
        // An attacker naming a different user in the payload.
        .send({ serving_size: 4, user_id: '99999999-9999-4999-8999-999999999999' });

      expect(captured.length).toBeGreaterThan(0);
      expect(captured[0].user_id).toBe(VALID_USER.id);
    });
  });

  describe('public routes stay public', () => {
    it('GET /health needs no token', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('GET / needs no token', async () => {
      const res = await request(app).get('/').set('Accept', 'application/json');
      expect(res.status).toBe(200);
    });
  });
});
