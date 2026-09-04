// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const prismaOnlyInRepositories = {
  files: ['src/**/*.ts'],
  ignores: ['src/**/*.repository.ts', 'src/prisma/**', 'src/app.module.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          { name: '@prisma/client', message: 'Prisma is only used from *.repository.ts (spec §0.3).' },
        ],
        patterns: [
          {
            group: ['**/prisma.service', '**/prisma/prisma.service', '**/prisma.module'],
            message: 'PrismaService is only injected in *.repository.ts (spec §0.3).',
          },
        ],
      },
    ],
  },
};

const controllersOnlyImportServicesAndDto = {
  files: ['src/**/*.controller.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          { group: ['**/*.repository', '@prisma/client', '**/prisma.service'], message: 'Controllers import services and dto only (spec §0.3).' },
        ],
      },
    ],
  },
};

const transformersArePure = {
  files: ['src/**/*.transformer.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      { patterns: [{ group: ['**/*.service', '**/*.repository', '@prisma/client'], message: 'Transformers are pure (spec §0.3).' }] },
    ],
  },
};

export default tseslint.config(
  { ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**', 'vitest.config.ts', 'coverage/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'commonjs',
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-extraneous-class': 'off',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  prismaOnlyInRepositories,
  controllersOnlyImportServicesAndDto,
  transformersArePure,
);
