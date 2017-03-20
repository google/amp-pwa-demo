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


import RequestStore from './_request_store'

const CACHE_NAME = 'app-cache';
const CACHE_STORE = new RequestStore(CACHE_NAME, 1);
const CACHE_MAX_AGE = 60 * 60 * 24 * 60;  // 60 days.
const CACHE_MAX_ENTRIES = 120;


/**
 * Parses query string of URL. This is needed because URL.searchParams is not
 * supported by many browsers.
 * @param {string} search The query string of the URL, with leading '?'.
 * @returns {object} The URL query parameters and values.
 */
export function parseQueryString(search) {
  let queryParams = {};
  for (let paramString of search.substring(1).split('&')) {
    let [key, ...values] = paramString.split('=');
    queryParams[key] = decodeURIComponent(values.join('='));
  }
  return queryParams;
}

/**
 * Removes UTM tracking params from a URL. This is necessary to prevent these
 * parameters from poisoning the cache.
 * @param {string} urlStr
 * @returns {string} The url, with tracking parameters removed.
 */
function removeTrackingParams(urlStr) {
  let url = new URL(urlStr, self.location);
  url.search = url.search
                  .slice(1)  // Skip leading '?'.
                  .split('&')
                  .filter(q => q && !q.startsWith('utm_'))
                  .join('&');
  return url.href;
}

/**
 * @param {string} url
 * @returns {Promise} Whether the URL has been cached.
 */
function findInCache(url) {
  url = removeTrackingParams(url);
  return caches.open(CACHE_NAME).then(cache => cache.match(url));
}

/**
 * Asynchronously compares two responses, and sends a message to all clients
 * that are currently showing an outdated version (e.g. to display a warning).
 * @param {string} url
 * @param {Response} oldResponse
 * @param {Response} newResponse
 */
function updateClients(url, oldResponse, newResponse) {
  let textPromises = [oldResponse, newResponse].map(r => r.clone().text());
  Promise.all(textPromises).then(texts => {
    if (texts[0] != texts[1]) {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          if (client.url == url) {
            client.postMessage('sw-backgroundsync');
          }
        });
      });
    }
  });
}

/**
 * Adds a new response into the cache, and update all active clients that are
 * currently displaying an old version of the page.
 * @param {string} url
 * @param {Response} response
 * @returns {Promise}
 */
function addToCache(url, response) {
  CACHE_STORE.add(url).then(() => cleanupCache());
  return caches.open(CACHE_NAME).then(cache => {
    return cache.match(url).then(oldResponse => {
      if (oldResponse) updateClients(url, oldResponse, response);
      console.log('[SW] Add to cache', url);
      return cache.put(url, response);
    });
  });
}

/**
 * Replacement for cache.add that includes credentials, only caches
 * successful responses, and performs additional cleanup.
 * @param {string} url
 * @returns {Promise}
 */
export function fetchAndCache(url) {
  url = removeTrackingParams(url);
  return fetch(url, {credentials: 'include'}).then(response => {
    if (response.status === 200) addToCache(url, response);
    return response.clone();
  });
}

/**
 * Fetches an external asset from NO-CORS domains, and adds it to the cache,
 * if it wasn't already cached. Note that no-cors mode means the response is
 * `opaque`, so that we can't check its status code.
 * @param {string} url to fetch and cache.
 * @returns {Promise}
 */
export function loadExternalCacheFirst(url) {
  let options = {credentials: 'include', mode: 'no-cors'};
  return findInCache(url).then(asset => {
    return asset || fetch(url, options).then(response => {
      console.log('[SW] Add to cache', url);
      caches.open(CACHE_NAME).then(cache => cache.put(url, response));
    });
  });
}

/**
 * Returns a url from cache, or fetches and adds it if it isn't there yet.
 * @param {string} url to load from cache.
 * @returns {Promise}
 */
export function loadCacheFirst(url) {
  return findInCache(url).then(response => response || fetchAndCache(url));
}

/**
 * Returns an url from cache and updates it in the background (or fetches and
 * adds it to the cache if it doesn't already exist).
 * @param {string} url
 * @returns {Promise}
 */
export function loadCacheFirstAndUpdate(url) {
  let fromNetwork = fetchAndCache(url);
  return findInCache(url).then(fromCache => fromCache || fromNetwork);
}

/**
 * Asynchronously deletes all previous cache instances.
 */
export function removeOldCaches() {
  self.caches.keys().then(cacheNames => cacheNames.forEach(cacheName => {
    if (cacheName !== CACHE_NAME) {
      console.log('[SW] Delete old cache', cacheName);
      caches.open(cacheName).then(cache => cache.keys().then(urlsToDelete => {
        return Promise.all(urlsToDelete.map(url => CACHE_STORE.remove(url)));
      }).then(() => self.caches.delete(cacheName)));
    }
  }));
}

/**
 * Removes old and too many items from the IDB cache store and the app cache.
 * @return {Promise}
 */
function cleanupCache() {
  return caches.open(CACHE_NAME).then(cache => {
    return CACHE_STORE.expireOldEntries(CACHE_MAX_AGE)
      .then(urlsToDelete => Promise.all(urlsToDelete.map(cache.delete)))
      .then(() => CACHE_STORE.expireExtraEntries(CACHE_MAX_ENTRIES))
      .then(urlsToDelete => Promise.all(urlsToDelete.map(cache.delete)))
  });
}
