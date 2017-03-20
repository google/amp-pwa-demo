/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


// Note: these events don't work on desktop!
window.addEventListener('online', function() {
  document.body.classList.remove('offline');
});

window.addEventListener('offline', function() {
  document.body.classList.add('offline');
});


document.addEventListener('navigate', function(e) {
  // Strict equality check for browsers which don't support navigator.onLine.
  if (navigator.onLine === false) {
    e.detail.body.classList.add('offline', 'offline-initial');
  }

  /**
   * Removes the .offline-disable class from links which are cached.
   */
  function checkCachedLinks() {
    let elements = e.detail.body.querySelectorAll('.offline-disable');
    [].slice.call(elements).forEach(function(el) {
      caches.match(el.href).then(function(response) {
        if (response) {
          el.classList.remove('offline-disable');
        }
      });
    });
  }

  window.addEventListener('online', function() {
    e.detail.body.classList.remove('offline');

    // Retry loading all broken images when coming back online.
    // Note that this also works for <amp-img>, which creates an <img> child.
    e.detail.body.querySelectorAll('img').forEach(function(img) {
      img.setAttribute('src', img.src);
    });
  });

  window.addEventListener('offline', function() {
    checkCachedLinks();  // Some links might have been cached since last time.
    e.detail.body.classList.add('offline');
  });

  checkCachedLinks();

  /**
   * Prefetch the first five links on the page.
   */
  function prefetchLinks() {
    console.log('[SW] Prefetch related articles.');
    let links = e.detail.body.querySelectorAll('a.precache');
    for (let i = 0; i < links.length && i < 5; ++i) {
      fetch(links[i].href, {credentials: 'include'});
    }
  }

  // Prefetch articles when a new service worker claims this page...
  navigator.serviceWorker.addEventListener('controllerchange', prefetchLinks);

  // ... or if there already is an activated service worker.
  navigator.serviceWorker.ready.then(function(registration) {
    if (registration.active) prefetchLinks();
  });

});
