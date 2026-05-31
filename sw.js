const CACHE_NAME = 'fightvault-v3'; // Erhöht auf v3, damit der Cache beim User neu geladen wird
const ASSETS = [
    '/',               
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json'
    // Hier kannst du später noch Icons oder Bilder hinzufügen
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Service Worker: Caching Assets');
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        })
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(res => {
            // Wenn die Datei im Cache ist, gib sie zurück, sonst hole sie aus dem Netz
            return res || fetch(e.request);
        }).catch(() => {
            // Optional: Wenn der User offline ist und die Datei nicht im Cache ist
            // return caches.match('/offline.html');
        })
    );
});