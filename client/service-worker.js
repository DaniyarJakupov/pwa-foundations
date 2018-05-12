const FALLBACK_IMG = 'https://localhost:3100/images/fallback-grocery.png';

const fallbackImages = 'fallback-image'; // cache name

/* INSTALL SERVICE WORKER EVENT LISTENER */
self.addEventListener('install', event => {
  // .waitUntil expects a Promise
  // caches.open returns a Promise
  event.waitUntil(
    caches.open(fallbackImages).then(cache => {
      cache.add(FALLBACK_IMG);
    })
  );
});
/* ===================================================== */
/* ACTIVATE SERVICE WORKER EVENT LISTENER */
self.addEventListener('activate', event => {
  // REMOVE all caches except fallbackImages
  // caches.keys().then(cacheNames => {
  // })
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
    event.respondWith(fetchImageOrFallback(event));
  }
});

/* ===================================================== */
/* HELPERS */
function fetchImageOrFallback(fetchEvent) {
  return fetch(fetchEvent.request, {
    mode: 'cors'
  })
    .then(response => {
      if (!response.ok) {
        return caches.match(FALLBACK_IMG, { cacheName: fallbackImages });
      } else {
        return response;
      }
    })
    .catch(() => {
      return caches.match(FALLBACK_IMG, { cacheName: fallbackImages });
    });
}
