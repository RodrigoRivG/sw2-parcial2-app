import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: {
    alias: { '@agro/compartido': fileURLToPath(new URL('../compartido/src/index.ts', import.meta.url)) },
  },
});
