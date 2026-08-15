import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * Test environment.
 *
 * lib/supabase.ts throws at import when its variables are missing, so
 * placeholders are set before anything imports it. The client itself is mocked
 * in the suites that touch it — nothing here reaches a real service.
 */
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
vi.stubEnv('VITE_API_URL', 'http://localhost:5001');

afterEach(() => {
  cleanup();
});
