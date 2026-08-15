/**
 * Test environment.
 *
 * lib/supabase.ts and lib/gemini.ts throw at import time when their variables
 * are missing — a deliberate fail-fast that also means tests must supply
 * placeholders. Nothing here reaches a real service: the Supabase and Gemini
 * clients are mocked in the suites that use them.
 */
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:3001';
process.env.AI_DAILY_QUOTA = '10';
process.env.NODE_ENV = 'test';
