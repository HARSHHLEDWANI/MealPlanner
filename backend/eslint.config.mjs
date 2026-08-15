import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      // tsc covers this with noUnusedLocals and handles type-only usage better.
      '@typescript-eslint/no-unused-vars': 'off',

      // Supabase rows and model responses are genuinely unknown until they are
      // validated, so a few `any`s at those boundaries are intentional.
      '@typescript-eslint/no-explicit-any': 'warn',

      // The Express Request augmentation in middleware/auth.ts needs it.
      '@typescript-eslint/no-namespace': 'off',
    },
  },
  {
    files: ['**/*.test.ts', 'src/__tests__/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
);
