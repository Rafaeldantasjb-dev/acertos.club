// Nome e versão do cache.
const CACHE_NAME = 'cache-v2-dynamic';

const ASSETS_TO_CACHE = [
    '/Assets/android-chrome-192x192.webp',
    '/Assets/android-chrome-512x512.webp',
    '/Assets/apple-touch-icon.webp',
    '/Assets/favicon-16x16.webp',
    '/Assets/favicon-32x32.webp',
    '/Assets/favicon.ico',
    '/Assets/og-image.jpg',
    '/style.css',
    '/script.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (event.request.mode === 'navigate' || (url.origin === self.location.origin && (url.pathname === '/' || url.pathname === '/index.html'))) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }
    if (ASSETS_TO_CACHE.some(asset => event.request.url.includes(asset))) {
        event.respondWith(
            caches.match(event.request).then((response) => response || fetch(event.request))
        );
        return;
    }
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});