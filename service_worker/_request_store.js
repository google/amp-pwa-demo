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


export default class RequestStore {

  /**
   * @param {string} name Name of the IndexedDB.
   * @param {number} version Version of the IndexedDB.
   */
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this.store = 'store';
    this.db = null;
  }

  /**
   * Returns instance of IndexedDB database. The result is cached.
   * @private
   * @returns {Promise}
   */
  getDB_() {
    return new Promise((resolve, reject) => {

      // Use cached instance if available.
      if (this.db) resolve(this.db);

      // Open (and create, if necessary) IDBDatabase.
      let request = indexedDB.open(this.name, this.version);
      request.onupgradeneeded = (event => {
        let db = event.target.result;
        let objectStore = db.createObjectStore(this.store, {keyPath: 'url'});
        objectStore.createIndex('time', 'time', {unique: false});
      });

      request.onsuccess = (event => {
        this.db = event.target.result;
        resolve(this.db);
      });

      request.onerror = reject;
    });
  }

  /**
   * Helper function to initialise an objectStore transaction.
   * @private
   * @param {Function} fn which takes objectStore as an argument and returns
   *   the final value with which the promise should be resolved.
   * @returns {Promise}
   */
  transaction_(fn) {
    return this.getDB_().then(db => {
      return new Promise((resolve, reject) => {
        let transaction = db.transaction([this.store], 'readwrite');
        let objectStore = transaction.objectStore(this.store);
        let response = fn(objectStore);
        transaction.oncomplete = function(e) { resolve(response || e); };
        transaction.onerror = reject;
      });
    });
  }

  /**
   * Helper function to initialise and loop over an objectStore cursor.
   * @private
   * @param {IDBObjectStore} objectStore for which to create a cursor.
   * @param {Function} fn which is called for every item in the object store.
   */
  cursor_(objectStore, fn) {
    objectStore.openCursor().onsuccess = (event => {
      let cursor = event.target.result;
      if (cursor) {
        fn(cursor.value);
        cursor.continue();
      }
    });
  }

  /**
   * @param {string} url A new URL to be added to the IDB store.
   * @returns {Promise}
   */
  add(url) {
    return this.transaction_(objectStore => {
      objectStore.put({url, time: Date.now()});
    });
  }

  /**
   * @param {string} url A URL to be removed from the IDB store.
   * @returns {Promise}
   */
  remove(url) {
    return this.transaction_(objectStore => { objectStore.delete(url); });
  }

  /**
   * @returns {Promise} Retrieves all urls currently in the IDB store.
   */
  getAll() {
    return this.transaction_(objectStore => {
      let urls = {};
      this.cursor_(objectStore, obj => { urls[obj.url] = obj.time; });
      return urls;
    });
  }

  /**
   * Removes all URLs currently in the IDB store.
   * @returns {Promise}
   */
  removeAll() {
    return this.transaction_(objectStore => {
      this.cursor_(objectStore, obj => { objectStore.delete(obj.url); });
    });
  }

  /**
   * Removes all URLs which are older than a specified time.
   * @param {number} maxAge
   * @returns {Promise} that resolves with a list of URLs that were removed.
   */
  expireOldEntries(maxAge) {
    return this.transaction_(objectStore => {
      let now = Date.now();
      let urls = [];

      let index = objectStore.index('time');
      this.cursor_(index, obj => {
        if (now - maxAge > obj.time) {
          urls.push(obj.url);
          objectStore.delete(obj.url);
        }
      });

      return urls;
    });
  }

  /**
   * Limits the total number of URLs stored in IDB.
   * @param {number} maxEntries
   * @returns {Promise} that resolves with a list of URLs that were removed.
   */
  expireExtraEntries(maxEntries) {
    return this.transaction_(objectStore => {
      let urls = [];

      let index = objectStore.index('time');
      let countRequest = index.count();
      countRequest.onsuccess = () => {
        let initialCount = countRequest.result;

        this.cursor_(index, obj => {
          if (initialCount - urls.length > maxEntries) {
            urls.push(obj.url);
            objectStore.delete(obj.url);
          }
        });
      };

      return urls;
    });
  }

}
