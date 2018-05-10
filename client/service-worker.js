const counts = {
  installs: 0,
  activations: 0,
  fetches: 0
};

self.addEventListener('install', event => {
  console.log('installs', ++counts.installs);
});

self.addEventListener('activate', event => {
  console.log('activations', ++counts.activations);
});

// self.addEventListener('fetch', event => {
//   console.log('fetches', event.request.url);
// });
