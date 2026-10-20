import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  minifyWhitespace: true,
  minifySyntax: true,
  target: 'esnext',
  outDir: 'dist',
  loader: { '.css': 'local-css' }
});

