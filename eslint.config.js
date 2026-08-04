import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

// The "lint" script used to be `echo 'Linter bypassed for JS output'`, which CI dutifully ran and
// reported as a passing step. A check that cannot fail is worse than no check: it puts a green tick
// next to work nobody did. This is a real configuration — deliberately narrow, so it catches the
// mistakes that matter (unused bindings, hook rules, undeclared globals) without turning the first
// run into a thousand style complaints.
export default [
  { ignores: ['dist/**', 'node_modules/**', 'build/**', 'coverage/**'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Bug-class rules are errors and fail the build: an undefined identifier is a crash waiting
      // for the right code path, and a hook called conditionally is a rendering bug.
      'no-undef': 'error',
      'react-hooks/rules-of-hooks': 'error',

      // Hygiene is a warning for now. Turning these on found 77 pre-existing unused bindings and
      // dead handlers across the two dashboards — a real backlog, but not one worth blocking every
      // commit on today, and not what this configuration was added to catch. Clear them and promote
      // this to 'error'.
      // (JSX makes the component name look unused to the base rule, hence the ignore patterns.)
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'no-useless-assignment': 'warn',
      'react-refresh/only-export-components': 'off',
    },
  },
];
