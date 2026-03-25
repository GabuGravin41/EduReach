const SW_VERSION = new URL(self.location.href).searchParams.get('v') || 'v1';
const APP_CACHE = `edureach-app-${SW_VERSION}`;
const STATIC_CACHE = `edureach-static-${SW_VERSION}`;
const API_CACHE = `edureach-api-${SW_VERSION}`;

// Max age for stale-while-revalidate API cache (5 minutes in ms)
const API_STALE_MS = 5 * 60 * 1000;

const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/logo.svg',
];

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
});

// ─── Skip-waiting message ───────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Activate: prune old caches ─────────────────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

/**
 * Returns true if a cached Response is still "fresh" (within API_STALE_MS).
 * We store a custom header `sw-cached-at` on the cached entry.
 */
const isFresh = (response) => {
  if (!response) return false;
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return false;
  return Date.now() - Number(cachedAt) < API_STALE_MS;
};

/**
 * Clone a response and stamp it with `sw-cached-at` so we can check freshness.
 */
const stampResponse = (response) => {
  const headers = new Headers(response.headers);
  headers.set('sw-cached-at', String(Date.now()));
  return response.blob().then(
    (body) => new Response(body, { status: response.status, statusText: response.statusText, headers })
  );
};

// ─── Fetch ────────────────────────────────────────────────────────────────────
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

  // ── Navigation: network-first with offline fallback ──────────────────────
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

  // ── API GET: stale-while-revalidate (5-min stale window) ─────────────────
  if (isApiGet(request, url)) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(request);

        // If we have a fresh cached response, return it immediately and revalidate in background
        if (cached && isFresh(cached)) {
          // Background revalidate
          fetch(request)
            .then((networkRes) => {
              if (networkRes.ok) {
                stampResponse(networkRes.clone()).then((stamped) => cache.put(request, stamped));
              }
            })
            .catch(() => { /* ignore background errors */ });
          return cached;
        }

        // Stale or missing: fetch from network, update cache, fall back to stale
        try {
          const networkRes = await fetch(request);
          if (networkRes.ok) {
            stampResponse(networkRes.clone()).then((stamped) => cache.put(request, stamped));
          }
          return networkRes;
        } catch {
          if (cached) return cached;
          return new Response(
            JSON.stringify({ detail: 'Offline and no cached response available.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      })
    );
    return;
  }

  // ── Static assets: cache-first, background update ────────────────────────
  if (isStaticAsset(request)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});
