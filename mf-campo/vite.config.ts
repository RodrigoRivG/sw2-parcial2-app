import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import css from 'vite-plugin-css-injected-by-js';
import { VitePWA } from 'vite-plugin-pwa';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const archivosRaiz = ['index.html', 'root-config.js', 'importmap.json', 'config.json',
  'estilos.css', 'system.min.js', 'compartido/compartido.js'];

export default defineConfig(({ command }) => ({
  base: '/campo/', plugins: [vue(), css(), VitePWA({
    strategies: 'generateSW', injectRegister: null, registerType: 'prompt',
    filename: 'sw.js', scope: '/campo/',
    manifest: {
      name: 'Agro · Campo', short_name: 'Agro Campo', lang: 'es',
      start_url: '/campo/', scope: '/campo/', display: 'standalone',
      icons: [{ src: '/campo/icono.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,svg,webmanifest}'],
      navigateFallback: '/index.html', navigateFallbackAllowlist: [/^\/campo\//],
      cleanupOutdatedCaches: true,
      maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      additionalManifestEntries: command === 'build' ? archivosRaiz.map(archivo => ({
        url: '/' + archivo,
        revision: createHash('sha256').update(readFileSync(
          fileURLToPath(new URL(`../dist/${archivo}`, import.meta.url)),
        )).digest('hex'),
      })) : [],
    },
  })],
  // TF.js se comprueba con el modelo real en navegador; no se simula la inferencia en Vitest.
  test: { coverage: { provider: 'v8', include: ['src/servicios/**/*.ts', 'src/stores/**/*.ts'], exclude: ['**/*.spec.ts', 'src/servicios/clasificador.ts'], thresholds: { lines: 80 } } },
  build: {
    outDir: '../dist/campo', emptyOutDir: true,
    rollupOptions: {
      input: 'src/main.ts', preserveEntrySignatures: 'strict', external: ['@agro/compartido'],
      output: { format: 'system', entryFileNames: 'campo.js', inlineDynamicImports: true },
    },
  },
}));
