import {
  precacheStaticAssets,
  removeUnusedCaches,
  ALL_CACHES_LIST,
  ALL_CACHES
} from './sw/caches.js';

const FALLBACK_IMG_URL = 'https://localhost:3100/images/fallback-grocery.png';

/* INSTALL SERVICE WORKER EVENT LISTENER */
self.addEventListener('install', event => {
  // .waitUntil expects a Promise
  event.waitUntil(
    Promise.all([
      // get the fallback image
      caches.open(ALL_CACHES.fallbackImages).then(cache => {
        cache.add(FALLBACK_IMG_URL);
      }),
      // populate the precache assets
      precacheStaticAssets()
    ])
  );
});
/* ===================================================== */
/* ACTIVATE SERVICE WORKER EVENT LISTENER */
self.addEventListener('activate', event => {
  // Delete all caches other than those whose names are provided in a list
  event.waitUntil(removeUnusedCaches(ALL_CACHES_LIST));
});

/* ===================================================== */
/* FETCH REQUESTS EVENT LISTENER */
self.addEventListener('fetch', event => {
  let acceptHeader = event.request.headers.get('accept');
  let requestUrl = new URL(event.request.url);
  if (
    acceptHeader.indexOf('image/*') >= 0 &&
    requestUrl.pathname.indexOf('/images/') === 0
  ) {
    // .respondWith takes a Promise
    event.respondWith(fetchImageOrFallback(event));
  }
});

/* ===================================================== */
/* HELPERS */
// Cache then Network Technique
function fetchImageOrFallback(fetchEvent) {
  return fetch(fetchEvent.request, {
    mode: 'cors',
    credentials: 'omit' // in case CORS wildcard headers are present
  })
    .then(response => {
      if (!response.ok) {
        return caches.match(FALLBACK_IMG_URL, {
          cacheName: ALL_CACHES.fallbackImages
        });
      } else {
        return response;
      }
    })
    .catch(() => {
      return caches.match(FALLBACK_IMG_URL, {
        cacheName: ALL_CACHES.fallbackImages
      });
    });
}
