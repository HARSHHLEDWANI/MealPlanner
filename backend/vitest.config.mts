import { defineConfig } from 'vitest/config';

// .mts rather than .ts: this package is CommonJS (ts-node runs the server),
// so an ESM config in a .ts file trips Vite's native config loader.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts'],
    // Route modules build their middleware chains at import time, and the rate
    // limiters hold module-level counters. Running suites in one worker keeps
    // that state from leaking between files.
    fileParallelism: false,
    maxWorkers: 1,
  },
});
