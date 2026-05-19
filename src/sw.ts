/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Required by vite-plugin-pwa: activates waiting SW when user confirms update
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Workout photos from Supabase Storage — CacheFirst, 30d ──────
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co') && url.pathname.includes('/storage/'),
  new CacheFirst({
    cacheName: 'workout-photos-v1',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 86400 })],
  })
);

// ── Supabase REST API — NetworkFirst, 5s fallback to cache ───────
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co') && url.pathname.startsWith('/rest/'),
  new NetworkFirst({ cacheName: 'supabase-api-v1', networkTimeoutSeconds: 5 })
);

// ── Push notification received ────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  const data = (event.data?.json() ?? {}) as {
    title?: string; body?: string; url?: string; tag?: string;
  };
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'UAIROX Desafio', {
      body: data.body ?? '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.tag ?? 'uairox-challenge',
      data: { url: data.url ?? '/' },
    })
  );
});

// ── Notification click → abre/foca o app ─────────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data as { url?: string })?.url ?? '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(list => {
        const match = list.find(c => c.url === targetUrl);
        if (match) return match.focus();
        return self.clients.openWindow(targetUrl);
      })
  );
});
