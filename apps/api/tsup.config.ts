import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  entry: ['src/index.ts'],
  external: ['pg', 'pg-native'],
  format: ['esm'],
  noExternal: ['@codexlink/db', '@codexlink/shared'],
  outDir: 'dist',
  platform: 'node',
  target: 'node22',
});
