import { defineConfig } from 'vitest/config';
export default defineConfig({
  build: {
    outDir: '../dist/compartido', emptyOutDir: true,
    rollupOptions: {
      input: 'src/index.ts', preserveEntrySignatures: 'strict',
      output: { format: 'system', entryFileNames: 'compartido.js', inlineDynamicImports: true },
    },
  },
  test: {
    coverage: {
      provider: 'v8', include: ['src/**/*.ts'], exclude: ['src/**/*.spec.ts'],
      thresholds: { lines: 80 },
    },
  },
});
