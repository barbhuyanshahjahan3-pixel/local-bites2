import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/delivery/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Custom service worker (src/sw.ts) instead of the auto-generated one,
      // so we can handle 'push' events — that's what lets a "delivery
      // available" alert reach the partner's phone with the app closed.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Local Bites — Delivery Partner',
        short_name: 'LB Delivery',
        description: 'Accept and complete deliveries for Local Bites',
        theme_color: '#65a30d',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/delivery/',
        scope: '/delivery/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: { port: 5176 },
});
