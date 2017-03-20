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


import './_analytics';
import './_loading_bar';
import './_notifications';
import './_offline-page';
import './_offline-styling';
import './_refresh';

const CONTAINER = document.querySelector('#body');
let AMP_DOC = null;
let PENDING_REQUEST = null;

/**
 * Fetches an AMP document and inserts it into the CONTAINER element.
 * @param {string} url
 * @returns {Promise}
 */
function loadAmpDoc(url) {
  // Cancel any pending requests.
  let canceled = false;
  if (PENDING_REQUEST) { PENDING_REQUEST(); }
  PENDING_REQUEST = function() { canceled = true; };

  // Trigger a custom event to indicate start of navigation.
  document.dispatchEvent(new CustomEvent('start-navigate'));

  fetch(url, {credentials: 'include'})
    .then(response => response.text())
    .then(text => {
      // Don't proceed if another request was started.
      if (canceled) return;

      // Create a new element on which to attach the shadow DOM.
      let ampContainer = document.createElement('div');

      // Parse the AMP document and attach it to the shadow DOM.
      let doc = (new DOMParser()).parseFromString(text, 'text/html');
      let ampDoc = window.AMP.attachShadowDoc(ampContainer, doc, url);

      // Find <body> (inside the shadow root, for browsers that support it),
      // or <amp-body> (a child node, for browsers without shadow DOM).
      let ampShadow = ampContainer.shadowRoot || ampContainer;
      let ampBody = ampShadow.querySelector('body, amp-body');

      // Trigger a custom event, and pass the new AMP body element.
      // TODO(plegner) Memory leak when ampBody is deleted!
      let event = new CustomEvent('navigate', {detail: {body: ampBody}});
      document.dispatchEvent(event);

      // Close and remove the previous AMP doc.
      if (AMP_DOC) AMP_DOC.close();
      CONTAINER.textContent = '';

      // Attach the AMP document and update the page title.
      document.title = doc.title || '';
      CONTAINER.appendChild(ampContainer);
      AMP_DOC = ampDoc;
    });
}

/**
 * Event handler for click events on <body>, to intercept all link clicks.
 * @param e
 */
function interceptLinkClick(e) {
  if (e.defaultPrevented || e.button) return;

  let a = event.target;
  while (a && (a.tagName != 'A' || !a.href)) {
    a = a.parentElement;
  }
  if (!a) return;

  if (new URL(a.href).origin === window.location.origin) {
    console.debug('[PWAMP] Intercept click:', a.href);
    e.preventDefault();
    window.history.pushState(null, '', a.href);
    loadAmpDoc(a.href);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  loadAmpDoc(window.location);
});

window.addEventListener('popstate', function() {
  console.debug('[PWAMP] Popstate:', window.location.pathname);
  loadAmpDoc(window.location);
});

document.addEventListener('navigate', function(e) {
  e.detail.body.addEventListener('click', interceptLinkClick);
});
document.body.addEventListener('click', interceptLinkClick);
