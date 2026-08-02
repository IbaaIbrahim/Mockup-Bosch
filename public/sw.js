// Minimal service worker — present so the app satisfies PWA installability
// criteria on Android/Chrome. It deliberately does not cache anything: the
// whole point of this demo is that the server itself runs locally, so there
// is no remote origin whose assets need offline caching (docs/09-SCOPE-
// CONFERENCE-DEMO.md §3, risk R1). A pure network passthrough is honest
// about that rather than pretending to add offline support it doesn't need.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
