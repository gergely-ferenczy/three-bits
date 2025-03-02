import eslint from '@eslint/js';
import tsEslint from 'typescript-eslint';

export default tsEslint.config(
  {
    ignores: ['eslint.config.js', 'eslint-import.config.js', 'dist/**'],
  },
  eslint.configs.recommended,
  ...tsEslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser',
        projectService: true,
      },
    },
    settings: {},
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
