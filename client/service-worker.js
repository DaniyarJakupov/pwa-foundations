import idb from 'idb';
import {
  precacheStaticAssets,
  removeUnusedCaches,
  ALL_CACHES_LIST,
  ALL_CACHES
} from './sw/caches.js';

const FALLBACK_IMG_URLS = [
  'https://localhost:3100/images/fallback-grocery.png',
  'https://localhost:3100/images/fallback-bakery.png',
  'https://localhost:3100/images/fallback-dairy.png',
  'https://localhost:3100/images/fallback-frozen.png',
  'https://localhost:3100/images/fallback-fruit.png',
  'https://localhost:3100/images/fallback-herbs.png',
  'https://localhost:3100/images/fallback-meat.png',
  'https://localhost:3100/images/fallback-vegetables.png'
];

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
        cache.addAll(FALLBACK_IMG_URLS);
      }),

      // Fetch assets, then populate the prefetch cache
      precacheStaticAssets(),

      // Populate IndexDB with grocery items
      downloadGroceryItems()
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

  // Check if the client requests image
  let isGroceryImage =
    acceptHeader.indexOf('image/*') >= 0 &&
    requestUrl.pathname.indexOf('/images/') === 0;

  //  Check if the client makes an API call
  let isAPI = requestUrl.origin.indexOf('localhost:3100') >= 0;

  //  Check if the client asks for html file
  let isHTMLRequest =
    event.request.headers.get('accept').indexOf('text/html') !== -1;
  let isLocal = new URL(event.request.url).origin === location.origin;
  if (isHTMLRequest && isLocal) {
    event.respondWith(
      // Fetch html from the server,
      // if network is disabled, serve html from the prefetch cache
      fetch(event.request).catch(() => {
        return caches.match(INDEX_HTML_URL, {
          cacheName: ALL_CACHES.prefetch
        });
      })
    );
  }
  /* Implementation of diff cache strategies depending on a client request */
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
        return fallbackImgForRequest(fetchEvent.request);
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

function fallbackImgForRequest(request) {
  let path = new URL(request.url).pathname;
  let itemId = parseInt(
    path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.')),
    10
  );

  return groceryItemDb
    .then(db => {
      return db
        .transaction('grocery-items')
        .objectStore('grocery-items')
        .get(itemId);
    })
    .then(groceryItem => {
      let { category } = groceryItem;

      return caches.match(
        `https://localhost:3100/images/fallback-${category.toLowerCase()}.png`,
        {
          cacheName: ALL_CACHES.fallbackImages
        }
      );
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

// ====== IndexDB ======
function groceryItemDb() {
  return idb.open('grocery-item-store', 1, upgradeDb => {
    switch (upgradeDb.oldVersion) {
    case 0:
      upgradeDb.createObjectStore('grocery-items', { keyPath: 'id' });
    }
  });
}

function downloadGroceryItems() {
  return groceryItemDb().then(db => {
    fetch('https://localhost:3100/api/grocery/items?limit=99999')
      .then(response => response.json())
      .then(({ data: groceryItems }) => {
        let tx = db.transaction('grocery-items', 'readwrite');
        tx.objectStore('grocery-items').clear();
        tx.complete.then(() => {
          let txx = db.transaction('grocery-items', 'readwrite');
          groceryItems.forEach(item => {
            txx.objectStore('grocery-items').put(item);
          });
          return txx.complete;
        });
      });
  });
}
