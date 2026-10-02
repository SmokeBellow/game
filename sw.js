// Минимальный сервис-воркер: нужен только для установки игры на главный экран.
// Он ничего не кеширует, поэтому обновления игры приходят сразу.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
