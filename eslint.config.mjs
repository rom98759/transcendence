import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
  {
    ignores: [
      '**/coverage/**', 
      '**/build/**', 
      '**/dist/**',
      '**/node_modules/**',
      '**/migrations/**',
      '**/generated/**',      // prisma sql migrations
      '**/prisma/client/**',      // prisma
      '**/*.d.ts',            // type definitions
      '**/*.json',            // type definitions
      '**/*.yaml',            // type definitions
      '**/*.yml',            // type definitions
    ]

  },
  {
    files: ['**/*.{js,mts,cts}'],
    languageOptions: { 
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,      // backend mode by default
        ...globals.es2021,
        },
      },
     parserOptions: {
      project: true,
      tsconfigRootDir: __dirname,
     },
     rules: {
       '@typescript-eslint/no-explicit-any': 'error',
       '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
       'eqeqeq': ['error', 'always'],
       'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
       'prefer-const': 'error',
     },
  },
   ...tseslint.configs.recommended,
  {
    files: ['srcs/nginx/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
      }
    }
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        project: false, // No tsconfig for config JS
      },
    },
    rules: {
        // add standard rules if needed
    }
  },
  eslintConfigPrettier,
];
