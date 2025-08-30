import tsEslint from 'typescript-eslint';
import importEslint from 'eslint-plugin-import';

const TypeScriptExtensions = ['.ts', '.cts', '.mts', '.tsx'];
const AllExtensions = [...TypeScriptExtensions, '.js', '.jsx', '.mjs', '.cjs'];

export default tsEslint.config(
  {
    ignores: ['eslint.config.js', 'vite.config.ts', 'dist/**'],
  },
  tsEslint.configs.base,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],

    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser',
        project: ['./tsconfig.json', './tsconfig.dev.json'],
      },
    },
    plugins: importEslint.flatConfigs.recommended.plugins,
    settings: {
      'import/extensions': AllExtensions,
      'import/external-module-folders': ['node_modules', 'node_modules/@types'],
      'import/parsers': {
        '@typescript-eslint/parser': TypeScriptExtensions,
      },
    },
    rules: {
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', ['parent', 'sibling', 'index', 'object', 'type']],
          alphabetize: {
            order: 'asc',
            orderImportKind: 'asc',
          },
          'newlines-between': 'ignore',
        },
      ],
    },
  },
);
