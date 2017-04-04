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


const WELCOME_NOTIFICATION = {
  title: 'You’ll now get notifications!',
  body: 'We’ll let you know about latest articles on The Daily Spoon.' +
        'You can unsubscribe any time.',
  icon: '/logo-white.png'
};

const BANNER_COOKIE = 'hide_notifications';
const WELCOME_COOKIE = 'welcome_notification';
const COOKIE_AGE = 60 * 60 * 24 * 30;  // 30 days.

const TOGGLE = document.querySelector('#notifications-toggle');
const BANNER = document.querySelector('#notifications-banner');
const ERROR = document.querySelector('#notifications-error');

// We only support notifications in Chrome (excluding Chrome on iOS)
const SUPPORTS_NOTIFICATIONS = window.chrome && !window.opr && !window.opera;

// Only show the banner on second pageview, and if it hasn't been dismissed.
const SHOW_BANNER = document.cookie.indexOf(BANNER_COOKIE) < 0 &&
                    document.referrer &&
                    new URL(document.referrer).origin == location.origin;

/**
 * Gets the GCM id from a subscription object.
 * @param {PushSubscription} subscription The subscription object.
 * @returns {string} The GCM id.
 */
function getGCMId(subscription) {
  var endpointSections = subscription.endpoint.split('/');
  return endpointSections[endpointSections.length - 1];
}


navigator.serviceWorker.ready.then(function(sw) {
  // Some old Chrome versions support service workers but no notifications.
  if (!sw.pushManager) return;

  let enabled = false;

  // Check if there is an existing subscription.
  sw.pushManager.getSubscription({userVisibleOnly: true}).then(function(sub) {
    if (sub) {
      // Already subscribed, update UI.
      TOGGLE.classList.add('enabled');
      enabled = true;
    } else if (SHOW_BANNER) {
      // Not yet subscribed, show banner after 5 seconds.
      setTimeout(function() {
        BANNER.classList.add('visible');
        if (window.ga) ga('send', 'event', 'PWA', 'Notifications banner shown');
      }, 5000);
    }
  });

  BANNER.querySelector('.primary').addEventListener('click', function() {
    if (window.ga) ga('send', 'event', 'PWA', 'Notifications banner accepted');
    subscribe();
  });

  BANNER.querySelector('.secondary').addEventListener('click', function() {
    if (window.ga) ga('send', 'event', 'PWA', 'Notifications banner dismissed');
    hideBanner();
  });

  TOGGLE.style.display = 'block';
  TOGGLE.addEventListener('click', function() {
    if (enabled) {
      unsubscribe();
    } else {
      subscribe();
    }
  });

  ERROR.querySelector('button').addEventListener('click', function() {
    ERROR.classList.remove('visible');
  });

  /**
   * Hides the subscribe to notifications banner and sets a cookie.
   */
  function hideBanner() {
    document.cookie = BANNER_COOKIE + '=y;max-age=' + COOKIE_AGE + ';path=/';
    BANNER.classList.remove('visible');
  }

  /**
   * Subscribe the user to push notifications.
   */
  function subscribe() {
    enabled = true;
    TOGGLE.classList.add('enabled');
    hideBanner();

    sw.pushManager.subscribe({userVisibleOnly: true})
      .then(sub => fetch('/_/add_subscription/?gcm_id=' + getGCMId(sub)))
      .then(function() {
        // Send welcome notification.
        if (document.cookie.indexOf(WELCOME_COOKIE) >= 0) return;
        document.cookie = WELCOME_COOKIE + '=y;max-age=' +
                          COOKIE_AGE + ';path=/';
        sw.showNotification(WELCOME_NOTIFICATION.title, {
          body: WELCOME_NOTIFICATION.body,
          icon: WELCOME_NOTIFICATION.icon
        });
      })
      .catch(function() {
        // User has disabled notifications in their browser.
        enabled = false;
        TOGGLE.classList.remove('enabled');
        ERROR.classList.add('visible');
      });
  }

  /**
   * Unsubscribe the user from push notifications.
   */
  function unsubscribe() {
    enabled = false;
    TOGGLE.classList.remove('enabled');
    hideBanner();

    sw.pushManager.getSubscription().then(function(sub) {
      if (sub) {
        sub.unsubscribe();
        fetch('/_/remove_subscription/?gcm_id=' + getGCMId(sub));
      }
    });
  }
});
