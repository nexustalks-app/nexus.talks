// Nexus.talks Service Worker — Lightweight PWA Foundation
const CACHE_NAME = 'nexus-talks-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/icon.svg', '/icon-192.png', '/icon-512.png']).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Stale-while-revalidate or network-first for navigation, pass-through for Supabase & API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass API, Supabase WebSocket, and authentication requests completely
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.hostname.includes('supabase.co') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Network-first strategy for pages to ensure real-time fresh messaging
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
