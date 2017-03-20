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


document.addEventListener('navigate', function(e) {

  // Show a button that sends a push notification when the page is available.
  const notifyButton = document.querySelector('.notify-article');
  if (window.Notification && notifyButton) {
    notifyButton.style.display = 'inline-block';
    notifyButton.addEventListener('click', function() {
      window.Notification.requestPermission().then(function(result) {
        if (result == 'granted') {
          navigator.serviceWorker.ready.then(function(sw) {
            sw.sync.register('notifyarticle:' + location.pathname);
            notifyBtn.textContent = 'Waiting…';
          });
        }
      });
      // TODO(plegner) Automatically refresh the page when the article is ready
      // and you're still here.
    });
  }

  // Show a list of all available articles.
  const cachedArticles = document.querySelector('.cached-articles');
  if (cachedArticles)  {
    window.caches.open('app-cache')
      .then(cache => cache.keys())
      .then(urls => {
        for (let u of urls.slice(0, 8)) {
          // TODO(plegner) Get title and image for every article.
          cachedArticles.innerHTML += `<a href='${u}'>Article Title</a>`
        }
      });
  }

});
