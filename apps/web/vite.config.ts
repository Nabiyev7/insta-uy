import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const API = process.env.DEV_API ?? 'http://127.0.0.1:8787';
const planFile = new URL('../../packages/shared/data/masterplan.json', import.meta.url);

/** Qulflangan bosh reja bitta manbadan beriladi (nusxa saqlanmaydi). */
const masterPlan = (): Plugin => ({
  name: 'master-plan',
  configureServer(server) {
    server.middlewares.use('/assets/masterplan.json', (_req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(readFileSync(planFile));
    });
  },
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'assets/masterplan.json', source: readFileSync(planFile) });
  },
});

export default defineConfig({
  plugins: [
    react(),
    masterPlan(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'CityLand UZ', short_name: 'CityLand UZ', lang: 'uz', display: 'fullscreen', orientation: 'any', background_color: '#14545f', theme_color: '#14545f',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
      },
      // Faqat xeshli fayllar (nom-XXXXXXXX.js) qayta tekshirilmaydi; glb/webp/json har nashrda yangilanadi.
      workbox: { dontCacheBustURLsMatching: /assets\/.+-[\w-]{8}\.(?:js|css|woff2)$/, globPatterns: ['**/*.{js,css,html,svg,woff2,webp,glb,json}'], maximumFileSizeToCacheInBytes: 4_000_000, navigateFallbackDenylist: [/^\/(uy|rest|auth|storage|socket\.io|pay|telegram|kutish)/] },
    }),
  ],
  server: { proxy: Object.fromEntries(['/rest', '/auth', '/storage', '/waitlist', '/uy', '/pay', '/telegram'].map((p) => [p, API]).concat([['/socket.io', { target: API, ws: true } as unknown as string]])) },
  build: {
    target: 'es2022',
    rollupOptions: { input: { main: 'index.html', kutish: 'kutish.html' } },
    chunkSizeWarningLimit: 900,
  },
});
