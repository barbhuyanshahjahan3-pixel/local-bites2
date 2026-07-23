/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

// Standard vite-plugin-pwa offline caching — unchanged from before.
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// This is what makes a new-order alert show up on the restaurant's phone
// even when the app/browser is completely closed — the browser wakes the
// service worker just for this event, runs this handler, shows the
// notification, then can go back to sleep. No open tab required.
self.addEventListener('push', (event: PushEvent) => {
  let data: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: 'Local Bites', body: event.data?.text() || 'You have a new update.' };
  }

  const title = data.title || 'Local Bites — Restaurant';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'You have a new order.',
      icon: '/restaurant/icons/icon-192.png',
      badge: '/restaurant/icons/icon-192.png',
      tag: data.tag || 'local-bites-order',
      // Renotify so a second order with the same tag still buzzes the phone,
      // instead of silently replacing the first notification.
      renotify: true,
      requireInteraction: true,
      data: { url: data.url || '/restaurant/' },
    })
  );
});

// Tapping the notification focuses an already-open tab if there is one,
// otherwise opens a new one straight to the dashboard.
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data?.url as string) || '/restaurant/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
