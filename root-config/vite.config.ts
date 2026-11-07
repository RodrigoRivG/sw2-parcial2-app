import { defineConfig } from 'vite';
import { copyFileSync } from 'node:fs';
export default defineConfig({
  plugins: [{ name: 'copiar-systemjs', closeBundle() {
    copyFileSync('node_modules/systemjs/dist/system.min.js', '../dist/system.min.js');
  } }],
  build: {
    outDir: '../dist', emptyOutDir: false,
    rollupOptions: {
      input: 'src/main.ts', preserveEntrySignatures: 'strict', external: ['@agro/compartido'],
      output: { format: 'system', entryFileNames: 'root-config.js', inlineDynamicImports: true },
    },
  },
});
