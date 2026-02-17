const SW_VERSION = new URL(self.location.href).searchParams.get('v') || 'v1';
const APP_CACHE = `edureach-app-${SW_VERSION}`;
const STATIC_CACHE = `edureach-static-${SW_VERSION}`;
const API_CACHE = `edureach-api-${SW_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/pwa-icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  const allowList = [APP_CACHE, STATIC_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (!allowList.includes(key)) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      )
    )
  );
  self.clients.claim();
});

const isStaticAsset = (request) =>
  request.destination === 'script' ||
  request.destination === 'style' ||
  request.destination === 'font' ||
  request.destination === 'image';

const isApiGet = (request, url) =>
  request.method === 'GET' &&
  (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/assessments/') ||
    url.pathname.includes('/courses/') ||
    url.pathname.includes('/study-groups/')
  );

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore unsupported schemes such as chrome-extension:// to avoid Cache API errors.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  if (request.method !== 'GET') {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(APP_CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;
          const appShell = await caches.match('/index.html');
          if (appShell) return appShell;
          return caches.match('/offline.html');
        })
    );
    return;
  }

  if (isApiGet(request, url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(API_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ detail: 'Offline and no cached response available.' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        })
    );
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});
