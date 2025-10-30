const CACHE = 'browserdb-v1';
const ASSETS = [
	'./',
	'./index.html',
	'./styles.css',
	'./main.js',
	'./db.js',
	'./storage.js',
	'./manifest.json'
	// sql-wasm.js e sql-wasm.wasm sono serviti dal CDN; browser li cacherà normalmente.
];

self.addEventListener('install', ev => {
	ev.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
	self.skipWaiting();
});

self.addEventListener('activate', ev => {
	ev.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', ev => {
	const req = ev.request;
	// prefer cache, fallback network
	ev.respondWith(
		caches.match(req).then(r => r || fetch(req).then(resp => {
			// opzionale caching dinamico per same-origin
			if (req.method === 'GET' && new URL(req.url).origin === self.location.origin) {
				caches.open(CACHE).then(cache => cache.put(req, resp.clone()));
			}
			return resp;
		}))
	);
});
