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


import RequestStore from './_request_store';
import {parseQueryString} from './_utilities';

const GA_HOST = 'www.google-analytics.com';
const GA_COLLECT_PATH = '/collect';
const ANALYTICS_STORE = new RequestStore('analytics-store', 1);

/**
 * If users visit the site while offline, we trigger this additional GA event,
 * to track the number of offline pageviews.
 */
const OFFLINE_EVENT_URL = `https://www.google-analytics.com/collect?v=1&t=event&ex=SetIsOffline&ea=Yes&ni=1`;


/**
 * Gets modified GA URL with queueTime GET parameter.
 * @param {string} url The original GA request URL.
 * @param {number} time UNIX timestamp of the original request, in ms.
 * @returns {Promise} The URL to report the event, including the queue time.
 */
function getDelayedUrl(url, time) {
  let newUrl = new URL(url);
  let queueTime = Date.now() - time;
  newUrl.search += (newUrl.search ? '&' : '?') + 'qt=' + queueTime;
  return newUrl.href;
}

/**
 * Replays stored Google Analytics requests.
 * @returns {Promise}
 */
function replayGARequest() {
  return ANALYTICS_STORE.getAll().then(requests => {
    let promise = Promise.resolve();
    for (let url of Object.keys(requests)) {
      promise = promise.then(() => {
        let requestUrl = getDelayedUrl(url, requests[url]);
        console.log('Replaying Google Analytics request:', requestUrl);
        return fetch(requestUrl).then(() => ANALYTICS_STORE.remove(url));
      });
    }
    return promise;
  });
}

/**
 * Replay GA events immediately, and when receiving sync.offlineAnalytics event.
 */
replayGARequest();
self.addEventListener('sync', function(event) {
  if (event.tag == 'analytics') {
    console.log('[SW] Handle sync event: analytics');
    return event.waitUntil(replayGARequest());
  }
});

self.addEventListener('fetch', function(event) {
  let url = new URL(event.request.url);
  let queryParams = parseQueryString(url.search);

  // Only intercept requests to Google Analytics.
  if (url.hostname != GA_HOST || url.pathname != GA_COLLECT_PATH) return;

  // Make the request, or store it in our cache if it fails.
  return event.respondWith(fetch(event.request).catch(() => {
    console.log('[SW] Adding GA call to IDB:', url.href);
    ANALYTICS_STORE.add(url.href);

    // For pageview events, also add a new custom 'SetIsGPOffline' event.
    if (queryParams.t == 'pageview') {
      let queryString = `&cid=${queryParams.cid}&tid=${queryParams.tic}`;
      ANALYTICS_STORE.add(OFFLINE_EVENT_URL + queryString);
    }
  }));
});
