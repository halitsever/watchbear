import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.vite/**', '**/test-results/**', '**/playwright-report/**'],
  },

  // type-aware base, only for the source we actually own. config/build files are
  // outside any tsconfig include, so linting them would trip projectService.
  {
    files: ['apps/*/src/**/*.{ts,tsx}', 'apps/extension/e2e/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    files: ['apps/extension/src/**/*.{ts,tsx}', 'apps/extension/e2e/**/*.ts'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    languageOptions: { globals: { ...globals.browser, chrome: 'readonly' } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // we intentionally reset local state when the room dependency changes; this
      // is the documented escape hatch, not a cascading-render bug.
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  {
    files: ['apps/server/src/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      // nest modules are intentionally empty decorated classes
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },

  {
    files: ['**/*.test.ts', 'apps/extension/e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/unbound-method': 'off',
      // playwright page/worker evaluate() crosses a context boundary and returns
      // untyped values by nature; the unsafe-* rules add only noise in test glue.
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },

  prettier,
);
