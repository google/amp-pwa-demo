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


const BAR = document.querySelector('#loading-bar');
const SPEED = 250;
let STATUS = 0;

function setProgress(n) {
  STATUS = n;

  let p = (Math.min(n, 1) - 1) * 100;
  BAR.style.transform = 'translate(' + p + '%, 0)';
  BAR.style.transition = 'all ' + SPEED + 'ms linear';
  BAR.offsetWidth;  // Repaint!
}

document.addEventListener('start-navigate', function() {
  BAR.style.display = 'block';
  BAR.style.transition = 'all 0 linear';
  BAR.style.transform = 'translateX(-100%)';
  BAR.offsetWidth;  // Repaint!

  setProgress(0.1);

  /**
   * Slowly increment the progress of the bar, so that users know
   * something is happening.
   */
  function increment() {
    setTimeout(function() {
      if (STATUS >= 0.9) return;
      setProgress(STATUS + Math.pow(12, 1 - STATUS) / 100);
      increment();
    }, SPEED)
  }
  increment();
});

document.addEventListener('navigate', function() {
  BAR.style.opacity = 0;
  setProgress(1);
  setTimeout(() => {
      BAR.style.display = 'none';
      BAR.style.opacity = 1;
    }, SPEED);
});
