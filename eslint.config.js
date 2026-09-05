import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'artifacts/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      curly: ['error', 'all'],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: 'function', next: '*' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/repositories/*', '@supabase/supabase-js'],
              message:
                'UI components must access persistence through application hooks.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/features/*/utils/**/*.ts',
      'src/features/*/schema/**/*.ts',
      'src/features/*/types/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-dom',
                'swr',
                '@supabase/*',
                '**/repositories/*',
                '**/hooks/*',
              ],
              message:
                'Domain rules must stay independent of UI and persistence.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/hooks/**/*.ts',
      'src/features/*/hooks/**/*.ts',
      'src/features/*/repositories/**/*.ts',
      'src/lib/**/*.ts',
    ],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['*.config.{js,ts}', 'tests/**/*.ts', 'scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
);
