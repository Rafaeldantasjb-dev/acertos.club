// Nome e versão do cache. Altere a versão (ex: v2) quando atualizar seus arquivos locais.
const CACHE_NAME = '77x-brasil-cache-v1';

// Arquivos locais que compõem a "casca" do aplicativo (App Shell)
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/Assets/icon-192x192.png',
    '/Assets/icon-512x512.png',
    '/Assets/favicon-16x16.webp',
    '/Assets/favicon-192x192.webp',
    '/Assets/favicon-32x32.webp',
    '/Assets/favicon-512.png',
    '/Assets/favicon.ico',
    '/Assets/og-image'
];

// 1. INSTALAÇÃO (Cache dos arquivos estáticos)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Fazendo cache do App Shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                // Força o SW a se tornar ativo imediatamente
                return self.skipWaiting();
            })
    );
});

// 2. ATIVAÇÃO (Limpeza de caches antigos)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Limpando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Garante que o SW controle os clientes imediatamente após ativado
    self.clients.claim();
});

// 3. INTERCEPTAÇÃO DE REQUISIÇÕES (Estratégia: Network First com fallback para Cache)
self.addEventListener('fetch', (event) => {
    // Ignora requisições de outras origens (como o iframe do sorteclub)
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Se a rede funcionar, atualiza o cache e retorna a resposta
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            })
            .catch(() => {
                // Se a rede falhar (offline), busca no cache
                return caches.match(event.request);
            })
    );
});
