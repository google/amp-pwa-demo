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


import {loadAmpDoc} from './_amp_loader';
import './_analytics';
import './_loading_bar';
import './_notifications';
import './_offline-page';
import './_offline-styling';
import './_refresh';


/**
 * Event handler for click events on <body>, to intercept all link clicks.
 * @param e
 */
function interceptLinkClick(e) {
  if (e.defaultPrevented || e.button) return;
  if (e.metaKey) return;

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
