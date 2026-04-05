import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          environment: 'node',
          exclude: ['**/dist/**', '**/node_modules/**', '**/.next/**'],
          globals: true,
          include: ['packages/**/*.test.ts', 'apps/api/**/*.test.ts'],
        },
      },
      {
        resolve: {
          alias: {
            '@': path.resolve(__dirname, 'apps/web'),
          },
        },
        test: {
          environment: 'jsdom',
          exclude: ['**/dist/**', '**/node_modules/**', '**/.next/**'],
          globals: true,
          include: ['apps/web/**/*.test.ts', 'apps/web/**/*.test.tsx'],
        },
      },
    ],
  },
});
