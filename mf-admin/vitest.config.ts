import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: {
    alias: { '@agro/compartido': fileURLToPath(new URL('./pruebas/compartido-simulado.ts', import.meta.url)) },
  },
});
