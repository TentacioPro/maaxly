import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Ignore build and external workspaces to keep lint fast and relevant
  globalIgnores([
    'node_modules/**',
    'dist/**',
    'build/**',
    'public/**',
    'golden-repo/**',
    'tweakcn-components/**',
    '**/.next/**',
  ]),
  {
    // Only lint our app source and server files
    files: ['src/**/*.{js,jsx}', 'server/**/*.js', 'vite.config.js'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
  'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }],
      'no-empty': 'off',
      'react-refresh/only-export-components': 'off',
      'no-constant-binary-expression': 'off',
  'react-hooks/exhaustive-deps': 'warn',
    },
  },
  // Node server files
  {
    files: ['server/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  // CommonJS server scripts using require/module
  {
    files: ['server/scripts/**/*.js'],
    languageOptions: {
  sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  // Vite config runs in Node
  {
    files: ['vite.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
])
