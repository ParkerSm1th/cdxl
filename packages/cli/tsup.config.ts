import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  entry: ['src/index.ts'],
  format: ['esm'],
  noExternal: ['@codexlink/shared'],
  outDir: 'dist',
  platform: 'node',
  target: 'node22',
});
