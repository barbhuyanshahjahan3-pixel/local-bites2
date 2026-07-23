import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/restaurant/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // injectManifest (instead of the default generateSW) lets us ship a
      // hand-written service worker (src/sw.ts) that listens for 'push'
      // events — this is what makes new-order notifications arrive even
      // when the restaurant has closed the app/browser entirely.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        // App shell is small; no need to precache every asset aggressively.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Local Bites — Restaurant',
        short_name: 'LB Restaurant',
        description: 'Manage your menu and orders on Local Bites',
        theme_color: '#16a34a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/restaurant/',
        scope: '/restaurant/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: { port: 5175 },
});
