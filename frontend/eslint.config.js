import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // tsc already reports unused locals with noUnusedLocals, and it
      // understands type-only usage better than the lint rule does.
      '@typescript-eslint/no-unused-vars': 'off',

      // Warn rather than error: a handful of deliberate `any`s exist at the
      // Supabase and model-response boundaries, where the data genuinely is
      // unknown until validated.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Tests mock modules and assert on loose shapes; the stricter rules get in
    // the way without catching real defects there.
    files: ['**/*.test.{ts,tsx}', 'src/__tests__/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
);
