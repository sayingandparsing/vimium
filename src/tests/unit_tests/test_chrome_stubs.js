/* eslint-disable
    block-scoped-var,
    camelcase,
    class-methods-use-this,
    consistent-return,
    no-multi-assign,
    no-param-reassign,
    no-restricted-syntax,
    no-return-assign,
    no-shadow,
    no-undef,
    no-unused-vars,
    no-var,
    vars-on-top,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS203: Remove `|| {}` from converted for-own loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

//
// This is a stub for chrome.strorage.sync for testing.
// It does what chrome.storage.sync should do (roughly), but does so synchronously.
// It also provides stubs for a number of other chrome APIs.
//

let XMLHttpRequest;
exports.window = {};
exports.localStorage = {};

global.navigator = { appVersion: '5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36' };

global.document = {
  createElement() { return {}; },
  addEventListener() {},
};

global.XMLHttpRequest = (XMLHttpRequest = class XMLHttpRequest {
  open() {}

  onload() {}

  send() {}
});

exports.chrome = {
  areRunningVimiumTests: true,

  runtime: {
    getURL() {},
    getManifest() {
      return { version: '1.2.3' };
    },
    onConnect: {
      addListener() { return true; },
    },
    onMessage: {
      addListener() { return true; },
    },
    onInstalled: {
      addListener() {},
    },
  },

  extension: {
    getURL(path) { return path; },
    getBackgroundPage() { return {}; },
    getViews() { return []; },
  },

  tabs: {
    onUpdated: {
      addListener() { return true; },
    },
    onAttached: {
      addListener() { return true; },
    },
    onMoved: {
      addListener() { return true; },
    },
    onRemoved: {
      addListener() { return true; },
    },
    onActivated: {
      addListener() { return true; },
    },
    onReplaced: {
      addListener() { return true; },
    },
    query() { return true; },
  },

  webNavigation: {
    onHistoryStateUpdated: {
      addListener() {},
    },
    onReferenceFragmentUpdated: {
      addListener() {},
    },
    onCommitted: {
      addListener() {},
    },
  },

  windows: {
    onRemoved: {
      addListener() { return true; },
    },
    getAll() { return true; },
    onFocusChanged: {
      addListener() { return true; },
    },
  },

  browserAction: {
    setBadgeBackgroundColor() {},
  },
  storage: {
    // chrome.storage.local
    local: {
      get(_, callback) { return (typeof callback === 'function' ? callback() : undefined); },
      set(_, callback) { return (typeof callback === 'function' ? callback() : undefined); },
      remove(_, callback) { return (typeof callback === 'function' ? callback() : undefined); },
    },

    // chrome.storage.onChanged
    onChanged: {
      addListener(func) { return this.func = func; },

      // Fake a callback from chrome.storage.sync.
      call(key, value) {
        chrome.runtime.lastError = undefined;
        const key_value = {};
        key_value[key] = { newValue: value };
        if (this.func) { return this.func(key_value, 'sync'); }
      },

      callEmpty(key) {
        chrome.runtime.lastError = undefined;
        if (this.func) {
          const items = {};
          items[key] = {};
          return this.func(items, 'sync');
        }
      },
    },

    session: {
      MAX_SESSION_RESULTS: 25,
    },

    // chrome.storage.sync
    sync: {
      store: {},

      set(items, callback) {
        let value;
        chrome.runtime.lastError = undefined;
        for (var key of Object.keys(items || {})) {
          value = items[key];
          this.store[key] = value;
        }
        if (callback) { callback(); }
        // Now, generate (supposedly asynchronous) notifications for listeners.
        return (() => {
          const result = [];
          for (key of Object.keys(items || {})) {
            value = items[key];
            result.push(global.chrome.storage.onChanged.call(key, value));
          }
          return result;
        })();
      },

      get(keys, callback) {
        let key;
        chrome.runtime.lastError = undefined;
        if (keys === null) {
          keys = [];
          for (key of Object.keys(this.store || {})) {
            const value = this.store[key];
            keys.push(key);
          }
        }
        const items = {};
        for (key of Array.from(keys)) {
          items[key] = this.store[key];
        }
        // Now, generate (supposedly asynchronous) callback
        if (callback) { return callback(items); }
      },

      remove(key, callback) {
        chrome.runtime.lastError = undefined;
        if (key in this.store) {
          delete this.store[key];
        }
        if (callback) { callback(); }
        // Now, generate (supposedly asynchronous) notification for listeners.
        return global.chrome.storage.onChanged.callEmpty(key);
      },
    },
  },
};
