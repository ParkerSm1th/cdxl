import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  entry: ['src/bin.ts', 'src/index.ts'],
  format: ['esm'],
  noExternal: ['@codexlink/shared', 'ora'],
  outDir: 'dist',
  platform: 'node',
  splitting: false,
  target: 'node22',
});
