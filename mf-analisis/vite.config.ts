import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import css from 'vite-plugin-css-injected-by-js';
export default defineConfig({
  base: '/analisis/',
  plugins: [react(), css()],
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/servicios/**/*.ts', 'src/apollo.ts'],
      exclude: ['**/*.spec.ts'],
      thresholds: { lines: 80 },
    },
  },
  build: {
    outDir: '../dist/analisis',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/main.tsx',
      preserveEntrySignatures: 'strict',
      external: ['@agro/compartido'],
      output: {
        format: 'system',
        entryFileNames: 'analisis.js',
        inlineDynamicImports: true,
      },
    },
  },
});
