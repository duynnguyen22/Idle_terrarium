import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { LEGACY_LONG_FILES, LEGACY_LONG_FUNCTIONS } from './eslint.legacy.js'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', '.superpowers', 'docs'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Size limits. Files and functions that predate them are listed in eslint.legacy.js.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: LEGACY_LONG_FILES,
    rules: { 'max-lines': 'off' },
  },
  {
    files: LEGACY_LONG_FUNCTIONS,
    rules: { 'max-lines-per-function': 'off' },
  },
  {
    // shadcn/ui primitives export cva variant helpers next to their components by design.
    files: ['src/components/ui/[a-z]*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
)
