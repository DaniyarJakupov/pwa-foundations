import {
  precacheStaticAssets,
  removeUnusedCaches,
  ALL_CACHES_LIST,
  ALL_CACHES
} from './sw/caches.js';

const FALLBACK_IMG_URL = 'https://localhost:3100/images/fallback-grocery.png';
const INDEX_HTML_PATH = '/';
const INDEX_HTML_URL = new URL(INDEX_HTML_PATH, self.location).toString();

/**
 * WE HAVE 3 CACHES FOR DIFF TYPES OF DATA (check './sw/caches.js)
 *  1. fallbackImages: cacheName('FALLBACK_IMAGES'), [fallback image]
 *  2. prefetch: cacheName('PREFETCH'), [app.js, web-app-manifest.json, static img]
 *  3. fallback: cacheName('FALLBACK') [api calls]
 */

/* INSTALL SERVICE WORKER EVENT LISTENER */
self.addEventListener('install', event => {
  // .waitUntil expects a Promise
  event.waitUntil(
    Promise.all([
      // Fetch fallback image and add it to fallbackImages cache
      caches.open(ALL_CACHES.fallbackImages).then(cache => {
        // cache.add fetches provided url and stores data
        cache.add(FALLBACK_IMG_URL);
      }),
      // Fetch assets, then populate the prefetch cache
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

  let isGroceryImage =
    acceptHeader.indexOf('image/*') >= 0 &&
    requestUrl.pathname.indexOf('/images/') === 0;

  let isAPI = requestUrl.origin.indexOf('localhost:3100') >= 0;

  /* Implementation of diff cache strategies depending on a file type */
  // .respondWith() takes a Promise
  event.respondWith(
    caches
      // Firstly, check prefetch cache [app.js, web-app-manifest.json, static img]
      .match(event.request, { cacheName: ALL_CACHES.prefetch })
      .then(response => {
        // If assets are found, return them
        if (response) return response;
        // If client requests images
        if (isGroceryImage) {
          return fetchImageOrFallback(event);
        } else if (isAPI) {
          // If client requests data from the server (json, etc...)
          return fetchAPIWithFallback(event);
        }
        // For everything else, make a request directly to the server
        return fetch(event.request);
      })
  );
});

/* ===================================================== */
/* ======= HELPER FUNCTIONS ======= */
// (Network with Cache Backup Technique && Cache then Network Technique)

// ====== Caching images ======
function fetchImageOrFallback(fetchEvent) {
  // Fetch images from the server
  return fetch(fetchEvent.request, {
    mode: 'cors'
    //credentials: 'omit' // in case CORS wildcard headers are present
  })
    .then(response => {
      // IF response without image, go to fallbackImages cache
      if (!response.ok) {
        return caches.match(FALLBACK_IMG_URL, {
          cacheName: ALL_CACHES.fallbackImages
        });
      } else {
        // Else, cache and return image from the server
        return caches.open(ALL_CACHES.fallback).then(cache => {
          // Clone the response and put its copy to the cache
          let clonedResponse = response.clone();
          // cache.put() is not fetching again, more efficient than cache.add
          cache.put(fetchEvent.request, clonedResponse);
          // Resolve Promise with the original response
          return response;
        });
      }
    })
    .catch(() => {
      // IF network fails, go to fallback cache
      return caches.match(fetchEvent.request, {
        cacheName: ALL_CACHES.fallback
      });
    });
}

// ====== Caching API responses (json, etc) ======
/**
 * @return {Promise<Response>}
 */
function fetchAPIWithFallback(fetchEvent) {
  // Open fallback cache, then
  return caches.open(ALL_CACHES.fallback).then(cache => {
    // fetch what you need from the server
    return fetch(fetchEvent.request)
      .then(response => {
        // Clone the response and put its copy to the cache
        let clonedResponse = response.clone();
        // cache.put() is not fetching again, more efficient than cache.add
        cache.put(fetchEvent.request, clonedResponse);
        // Resolve Promise with the original response
        return response;
      })
      .catch(() => {
        // IF network fails, serve from the cache
        return cache.match(fetchEvent.request);
      });
  });
}
