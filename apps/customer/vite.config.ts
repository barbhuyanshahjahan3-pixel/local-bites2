import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Local Bites',
        short_name: 'Local Bites',
        description: 'Order food from local restaurants in Hojai and beyond',
        theme_color: '#ea580c',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // The customer app's service worker registers at scope "/" and would
        // otherwise be able to intercept navigations into the other apps'
        // sub-paths (they each have their own, more specific service worker,
        // but only after the first visit registers it). Excluding these
        // paths keeps the customer SW from ever serving its own index.html
        // fallback for a URL that belongs to another app.
        navigateFallbackDenylist: [/^\/restaurant\//, /^\/delivery\//, /^\/admin\//, /^\/super-admin\//],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'document' &&
              !/^\/(restaurant|delivery|admin|super-admin)\//.test(url.pathname),
            handler: 'NetworkFirst',
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/public'),
            handler: 'NetworkFirst',
            options: { cacheName: 'lb-public-api', expiration: { maxEntries: 100, maxAgeSeconds: 300 } },
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
});
