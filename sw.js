const CACHE_NAME = 'fightvault-v3';
const ASSETS = [
    '/Fight-Vault/',
    '/Fight-Vault/index.html',
    '/Fight-Vault/style.css',
    '/Fight-Vault/script.js',
    '/Fight-Vault/manifest.json',
    '/Fight-Vault/icon-512.png'
];

// Installation: alle Dateien in den Cache laden
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Aktivierung: alten Cache löschen
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch: erst Cache, dann Netzwerk (Offline-first)
self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(response => {
                let responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, responseClone));
                return response;
            });
        }).catch(() => caches.match('/Fight-Vault/index.html'))
    );
});
