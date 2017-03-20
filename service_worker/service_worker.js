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


import './_notifications';
import './_analytics';
import {
  fetchAndCache,
  loadExternalCacheFirst,
  loadCacheFirst,
  loadCacheFirstAndUpdate,
  removeOldCaches
} from './_utilities';

const APP_SHELL_PAGE = '/_/app_shell';
const OFFLINE_PAGE = '/_/offline/';
const PRECACHE = ['/', OFFLINE_PAGE];


self.addEventListener('install', function(event) {
  console.log('[SW] Install service worker.');

  // Activate the service worker as soon as the app shell page is cached.
  event.waitUntil(loadCacheFirst(APP_SHELL_PAGE).then(() => {
    self.skipWaiting();
  }));

  // Precache/update a few other non-essential urls asynchronously.
  PRECACHE.forEach(path => loadCacheFirst(path));
});


self.addEventListener('activate', function(event) {
  console.log('[SW] Activate service worker.');

  // Activate the service worker and claim all open windows.
  let activationPromise = self.clients.claim();
  event.waitUntil(activationPromise);

  // Precache the content of all open windows. It might not yet be in our cache,
  // if the window were opened before the service worker was installed.
  activationPromise.then(() => self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      loadCacheFirst(client.url);
    });
  }));

  // Remove all previous cache versions.
  removeOldCaches();
});

self.addEventListener('fetch', function(event) {
  let url = new URL(event.request.url);

  // We only intercept GET requests to the current domain..
  if (event.request.method != 'GET' || url.host != location.host) return;

  // We don't certain intercept internal requests.
  if (url.pathname.startsWith('/_/')) return;

  // For AMP navigation requests, return the app shell but immediately start
  // loading/updating the requested cached page in the background.
  if (event.request.mode == 'navigate') {
    fetchAndCache(url.href);
    return event.respondWith(loadCacheFirst(APP_SHELL_PAGE));
  }

  // These should only be AJAX requests made by the app shell. We immediately
  // return them from cache, if possible, and show the offline page as fallback.
  // We need to ensure that the offline page is returned with an error code.
  event.respondWith(loadCacheFirstAndUpdate(url.href)
    .catch(() => loadCacheFirst(OFFLINE_PAGE)
      .then(response => response.clone().text())
      .then(text => new Response(text, {
        ok: false,
        status: 503,
        headers: {'content-type': 'text/html'}
      }))
    )
  );
});

self.addEventListener('sync', function(event) {
  let [name, data] = event.tag.split(':');
  if (name == 'notifyarticle') {
    console.log('[SW] Handle sync event:', event.tag);
    return event.waitUntil(fetchAndCache(data).then(function() {
      // TODO(plegner) Get article title, body and thumbnail for notification.
      self.registration.showNotification('Your article is ready!', {
        body: 'Body',
        icon: 'Icon',
        data: {url: location.origin + data}
      });
    }));
  }
});
