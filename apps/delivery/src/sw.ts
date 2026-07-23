/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Wakes up even with the app/browser fully closed (as long as the device has
// network) to show a "delivery available" alert.
self.addEventListener('push', (event: PushEvent) => {
  let data: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: 'Local Bites', body: event.data?.text() || 'You have a new update.' };
  }

  const title = data.title || 'Local Bites — Delivery';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'A new delivery is available.',
      icon: '/delivery/icons/icon-192.png',
      badge: '/delivery/icons/icon-192.png',
      tag: data.tag || 'local-bites-delivery',
      renotify: true,
      requireInteraction: true,
      data: { url: data.url || '/delivery/' },
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data?.url as string) || '/delivery/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
