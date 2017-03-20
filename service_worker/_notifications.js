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


import { loadCacheFirst } from './_utilities';

const LATEST_ARTICLE = '/_/latest_article';


/**
 * For simplicity, we send notifications without payload. That means we need to
 * get the notification data (from NOTIFICATIONS_PAGE), before we can show
 * anything. We also precache the article before showing a notification.
 */
self.addEventListener('push', function(event) {
  event.waitUntil(self.registration.pushManager.getSubscription()
    .then(() => fetch(LATEST_ARTICLE))
    .then(response => response.json())
    .then(notification => {
      return loadCacheFirst(notification.url)
        .then(() => self.registration.showNotification(notification.title, {
          body: notification.body,
          icon: notification.icon,
          data: {url: notification.url}
        }));
    }));
});

/**
 * When clicking a notification, we need to manually close it and open the link.
 */
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
