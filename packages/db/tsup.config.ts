import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  entry: ['src/index.ts', 'src/migrate.ts'],
  external: ['pg', 'pg-native'],
  format: ['esm'],
  noExternal: ['@codexlink/shared'],
  outDir: 'dist',
  platform: 'node',
  target: 'node22',
});
