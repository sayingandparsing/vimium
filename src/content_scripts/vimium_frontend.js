/* eslint-disable
    consistent-return,
    func-names,
    max-len,
    no-cond-assign,
    no-empty,
    no-loop-func,
    no-multi-assign,
    no-nested-ternary,
    no-new,
    no-param-reassign,
    no-restricted-syntax,
    no-return-assign,
    no-shadow,
    no-undef,
    no-underscore-dangle,
    no-unused-vars,
    no-use-before-define,
    no-useless-escape,
    no-var,
    prefer-rest-params,
    semi-style,
    vars-on-top,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//
// This content script must be run prior to domReady so that we perform some operations very early.
//

const root = typeof exports !== 'undefined' && exports !== null ? exports : (window.root != null ? window.root : (window.root = {}));
// On Firefox, sometimes the variables assigned to window are lost (bug 1408996), so we reinstall them.
// NOTE(mrmr1993): This bug leads to catastrophic failure (ie. nothing works and errors abound).
DomUtils.documentReady(() => {
  if (typeof extend === 'undefined' || extend === null) { return root.extend(window, root); }
});

let isEnabledForUrl = true;
const isIncognitoMode = chrome.extension.inIncognitoContext;
let normalMode = null;

// We track whther the current window has the focus or not.
const windowIsFocused = (function () {
  let windowHasFocus = null;
  DomUtils.documentReady(() => windowHasFocus = document.hasFocus());
  window.addEventListener('focus', forTrusted((event) => {
    if (event.target === window) { windowHasFocus = true; } return true;
  }));
  window.addEventListener('blur', forTrusted((event) => {
    if (event.target === window) { windowHasFocus = false; } return true;
  }));
  return () => windowHasFocus;
}());

// This is set by Frame.registerFrameId(). A frameId of 0 indicates that this is the top frame in the tab.
let frameId = null;

// For debugging only. This writes to the Vimium log page, the URL of whichis shown on the console on the
// background page.
const bgLog = function (...args) {
  args = (Array.from(args).map(arg => arg.toString()));
  return Frame.postMessage('log', { message: args.join(' ') });
};

// If an input grabs the focus before the user has interacted with the page, then grab it back (if the
// grabBackFocus option is set).
class GrabBackFocus extends Mode {
  constructor() {
    let listener;
    const exitEventHandler = () => this.alwaysContinueBubbling(() => {
      this.exit();
      return chrome.runtime.sendMessage({ handler: 'sendMessageToFrames', message: { name: 'userIsInteractingWithThePage' } });
    });

    super({
      name: 'grab-back-focus',
      keydown: exitEventHandler,
    });

    this.push({
      _name: 'grab-back-focus-mousedown',
      mousedown: exitEventHandler,
    });

    Settings.use('grabBackFocus', (grabBackFocus) => {
      // It is possible that this mode exits (e.g. due to a key event) before the settings are ready -- in
      // which case we should not install this grab-back-focus watcher.
      if (this.modeIsActive) {
        if (grabBackFocus) {
          this.push({
            _name: 'grab-back-focus-focus',
            focus: event => this.grabBackFocus(event.target),
          });
          // An input may already be focused. If so, grab back the focus.
          if (document.activeElement) { return this.grabBackFocus(document.activeElement); }
        } else {
          return this.exit();
        }
      }
    });

    // This mode is active in all frames.  A user might have begun interacting with one frame without other
    // frames detecting this.  When one GrabBackFocus mode exits, we broadcast a message to inform all
    // GrabBackFocus modes that they should exit; see #2296.
    chrome.runtime.onMessage.addListener(listener = ({ name }) => {
      if (name === 'userIsInteractingWithThePage') {
        chrome.runtime.onMessage.removeListener(listener);
        if (this.modeIsActive) { this.exit(); }
      }
      return false;
    }); // We will not be calling sendResponse.
  }

  grabBackFocus(element) {
    if (!DomUtils.isFocusable(element)) { return this.continueBubbling; }
    element.blur();
    return this.suppressEvent;
  }
}

// Pages can load new content dynamically and change the displayed URL using history.pushState. Since this can
// often be indistinguishable from an actual new page load for the user, we should also re-start GrabBackFocus
// for these as well. This fixes issue #1622.
handlerStack.push({
  _name: 'GrabBackFocus-pushState-monitor',
  click(event) {
    // If a focusable element is focused, the user must have clicked on it. Retain focus and bail.
    if (DomUtils.isFocusable(document.activeElement)) { return true; }

    let { target } = event;
    while (target) {
      // Often, a link which triggers a content load and url change with javascript will also have the new
      // url as it's href attribute.
      if ((target.tagName === 'A')
         && (target.origin === document.location.origin)
         // Clicking the link will change the url of this frame.
         && ((target.pathName !== document.location.pathName)
          || (target.search !== document.location.search))
         && (['', '_self'].includes(target.target)
          || ((target.target === '_parent') && (window.parent === window))
          || ((target.target === '_top') && (window.top === window)))) {
        return new GrabBackFocus();
      }
      target = target.parentElement;
    }
    return true;
  },
});

const installModes = function () {
  // Install the permanent modes. The permanently-installed insert mode tracks focus/blur events, and
  // activates/deactivates itself accordingly.
  normalMode = new NormalMode();
  // Initialize components upon which normal mode depends.
  Scroller.init();
  FindModeHistory.init();
  new InsertMode({ permanent: true });
  if (isEnabledForUrl) { new GrabBackFocus(); }
  return normalMode; // Return the normalMode object (for the tests).
};

//
// Complete initialization work that should be done prior to DOMReady.
//
const initializePreDomReady = function () {
  installListeners();
  Frame.init();
  checkIfEnabledForUrl(document.hasFocus());

  const requestHandlers = {
    focusFrame(request) { if (frameId === request.frameId) { return focusThisFrame(request); } },
    getScrollPosition(ignoredA, ignoredB, sendResponse) {
      if (frameId === 0) { return sendResponse({ scrollX: window.scrollX, scrollY: window.scrollY }); }
    },
    setScrollPosition,
    frameFocused() {}, // A frame has received the focus; we don't care here (UI components handle this).
    checkEnabledAfterURLChange,
    runInTopFrame({ sourceFrameId, registryEntry }) {
      if (DomUtils.isTopFrame()) { return NormalModeCommands[registryEntry.command](sourceFrameId, registryEntry); }
    },
    linkHintsMessage(request) { return HintCoordinator[request.messageType](request); },
  };

  return chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    request.isTrusted = true;
    // Some requests intended for the background page are delivered to the options page too; ignore them.
    if (!request.handler || !!request.name) {
      // Some request are handled elsewhere; ignore them too.
      if (!['userIsInteractingWithThePage'].includes(request.name)) {
        if (isEnabledForUrl || ['checkEnabledAfterURLChange', 'runInTopFrame'].includes(request.name)) {
          requestHandlers[request.name](request, sender, sendResponse);
        }
      }
    }
    return false;
  }); // Ensure that the sendResponse callback is freed.
};

// Wrapper to install event listeners.  Syntactic sugar.
const installListener = (element, event, callback) => element.addEventListener(event, forTrusted(function () {
  if (typeof extend === 'undefined' || extend === null) { root.extend(window, root); } // See #2800.
  if (isEnabledForUrl) { return callback.apply(this, arguments); } return true;
}), true)
;

//
// Installing or uninstalling listeners is error prone. Instead we elect to check isEnabledForUrl each time so
// we know whether the listener should run or not.
// Run this as early as possible, so the page can't register any event handlers before us.
// Note: We install the listeners even if Vimium is disabled.  See comment in commit
// 6446cf04c7b44c3d419dc450a73b60bcaf5cdf02.
//
var installListeners = Utils.makeIdempotent(() => {
  // Key event handlers fire on window before they do on document. Prefer window for key events so the page
  // can't set handlers to grab the keys before us.
  for (const type of ['keydown', 'keypress', 'keyup', 'click', 'focus', 'blur', 'mousedown', 'scroll']) {
    (type => installListener(window, type, event => handlerStack.bubbleEvent(type, event)))(type);
  }
  return installListener(document, 'DOMActivate', event => handlerStack.bubbleEvent('DOMActivate', event));
});

//
// Whenever we get the focus:
// - Tell the background page this frame's URL.
// - Check if we should be enabled.
//
const onFocus = forTrusted((event) => {
  if (event.target === window) {
    chrome.runtime.sendMessage({ handler: 'frameFocused' });
    return checkIfEnabledForUrl(true);
  }
});

// We install these listeners directly (that is, we don't use installListener) because we still need to receive
// events when Vimium is not enabled.
window.addEventListener('focus', onFocus);
window.addEventListener('hashchange', () => checkEnabledAfterURLChange());

const initializeOnDomReady = () => Frame.postMessage('domReady');
var Frame = {
  port: null,
  listeners: {},

  addEventListener(handler, callback) { return this.listeners[handler] = callback; },
  postMessage(handler, request) { if (request == null) { request = {}; } return this.port.postMessage(extend(request, { handler })); },
  linkHintsMessage(request) { return HintCoordinator[request.messageType](request); },
  registerFrameId({ chromeFrameId }) {
    frameId = (root.frameId = (window.frameId = chromeFrameId));
    // We register a frame immediately only if it is focused or its window isn't tiny.  We register tiny
    // frames later, when necessary.  This affects focusFrame() and link hints.
    if (windowIsFocused() || !DomUtils.windowIsTooSmall()) {
      return Frame.postMessage('registerFrame');
    }
    let focusHandler; let
      resizeHandler;
    const postRegisterFrame = function () {
      window.removeEventListener('focus', focusHandler);
      window.removeEventListener('resize', resizeHandler);
      return Frame.postMessage('registerFrame');
    };
    window.addEventListener('focus', (focusHandler = forTrusted((event) => {
      if (event.target === window) { return postRegisterFrame(); }
    })));
    return window.addEventListener('resize', (resizeHandler = forTrusted((event) => {
      if (!DomUtils.windowIsTooSmall()) { return postRegisterFrame(); }
    })));
  },

  init() {
    let disconnect;
    this.port = chrome.runtime.connect({ name: 'frames' });

    this.port.onMessage.addListener((request) => {
      if (typeof extend === 'undefined' || extend === null) { root.extend(window, root); } // See #2800 and #2831.
      return (this.listeners[request.handler] != null ? this.listeners[request.handler] : this[request.handler])(request);
    });

    // We disable the content scripts when we lose contact with the background page, or on unload.
    this.port.onDisconnect.addListener(disconnect = Utils.makeIdempotent(() => this.disconnect()));
    return window.addEventListener('unload', forTrusted(disconnect));
  },

  disconnect() {
    try { this.postMessage('unregisterFrame'); } catch (error) {}
    try { this.port.disconnect(); } catch (error1) {}
    this.postMessage = (this.disconnect = function () {});
    this.port = null;
    this.listeners = {};
    HintCoordinator.exit({ isSuccess: false });
    handlerStack.reset();
    isEnabledForUrl = false;
    window.removeEventListener('focus', onFocus);
    return window.removeEventListener('hashchange', checkEnabledAfterURLChange);
  },
};

var setScrollPosition = ({ scrollX, scrollY }) => DomUtils.documentReady(() => {
  if (DomUtils.isTopFrame()) {
    window.focus();
    document.body.focus();
    if ((scrollX > 0) || (scrollY > 0)) {
      Marks.setPreviousPosition();
      return window.scrollTo(scrollX, scrollY);
    }
  }
});
const flashFrame = (function () {
  let highlightedFrameElement = null;

  return function () {
    if (highlightedFrameElement == null) {
      highlightedFrameElement = (function () {
      // Create a shadow DOM wrapping the frame so the page's styles don't interfere with ours.
        let left;
        highlightedFrameElement = DomUtils.createElement('div');
        // PhantomJS doesn't support createShadowRoot, so guard against its non-existance.
        const _shadowDOM = (left = (typeof highlightedFrameElement.createShadowRoot === 'function' ? highlightedFrameElement.createShadowRoot() : undefined)) != null ? left : highlightedFrameElement;

        // Inject stylesheet.
        const _styleSheet = DomUtils.createElement('style');
        _styleSheet.innerHTML = `@import url(\"${chrome.runtime.getURL('content_scripts/vimium.css')}\");`;
        _shadowDOM.appendChild(_styleSheet);

        const _frameEl = DomUtils.createElement('div');
        _frameEl.className = 'vimiumReset vimiumHighlightedFrame';
        _shadowDOM.appendChild(_frameEl);

        return highlightedFrameElement;
      }());
    }

    document.documentElement.appendChild(highlightedFrameElement);
    return Utils.setTimeout(200, () => highlightedFrameElement.remove());
  };
}());

//
// Called from the backend in order to change frame focus.
//
var focusThisFrame = function (request) {
  if (!request.forceFocusThisFrame) {
    if (DomUtils.windowIsTooSmall() || ((document.body != null ? document.body.tagName.toLowerCase() : undefined) === 'frameset')) {
      // This frame is too small to focus or it's a frameset. Cancel and tell the background page to focus the
      // next frame instead.  This affects sites like Google Inbox, which have many tiny iframes. See #1317.
      chrome.runtime.sendMessage({ handler: 'nextFrame' });
      return;
    }
  }
  window.focus();
  // On Firefox, window.focus doesn't always draw focus back from a child frame (bug 554039).
  // We blur the active element if it is an iframe, which gives the window back focus as intended.
  if (document.activeElement.tagName.toLowerCase() === 'iframe') { document.activeElement.blur(); }
  if (request.highlight) { return flashFrame(); }
};

// Used by focusInput command.
root.lastFocusedInput = (function () {
  // Track the most recently focused input element.
  let recentlyFocusedElement = null;
  window.addEventListener('focus',
    forTrusted((event) => {
      const DomUtils = window.DomUtils != null ? window.DomUtils : root.DomUtils; // Workaround FF bug 1408996.
      if (DomUtils.isEditable(event.target)) {
        return recentlyFocusedElement = event.target;
      }
    }),
    true);
  return () => recentlyFocusedElement;
}());

// Checks if Vimium should be enabled or not in this frame.  As a side effect, it also informs the background
// page whether this frame has the focus, allowing the background page to track the active frame's URL and set
// the page icon.
var checkIfEnabledForUrl = (function () {
  Frame.addEventListener('isEnabledForUrl', (response) => {
    let frameIsFocused; let isFirefox; let
      passKeys;
    ({
      isEnabledForUrl, passKeys, frameIsFocused, isFirefox,
    } = response);
    Utils.isFirefox = () => isFirefox;
    if (!normalMode) { installModes(); }
    normalMode.setPassKeys(passKeys);
    // Hide the HUD if we're not enabled.
    if (!isEnabledForUrl) { return HUD.hide(true, false); }
  });

  return function (frameIsFocused) {
    if (frameIsFocused == null) { frameIsFocused = windowIsFocused(); }
    return Frame.postMessage('isEnabledForUrl', { frameIsFocused, url: window.location.toString() });
  };
}());

// When we're informed by the background page that a URL in this tab has changed, we check if we have the
// correct enabled state (but only if this frame has the focus).
var checkEnabledAfterURLChange = forTrusted(() => {
  if (windowIsFocused()) { return checkIfEnabledForUrl(); }
});

// If we are in the help dialog iframe, then HelpDialog is already defined with the necessary functions.
if (root.HelpDialog == null) {
  root.HelpDialog = {
    helpUI: null,
    isShowing() { return (this.helpUI != null ? this.helpUI.showing : undefined); },
    abort() { if (this.isShowing()) { return this.helpUI.hide(false); } },

    toggle(request) {
      DomUtils.documentComplete(() => (this.helpUI != null ? this.helpUI : (this.helpUI = new UIComponent('pages/help_dialog.html', 'vimiumHelpDialogFrame', (() => {})))));
      if ((this.helpUI != null) && this.isShowing()) {
        return this.helpUI.hide();
      } if (this.helpUI != null) {
        return this.helpUI.activate(extend(request,
          { name: 'activate', focus: true }));
      }
    },
  };
}

initializePreDomReady();
DomUtils.documentReady(initializeOnDomReady);

root.handlerStack = handlerStack;
root.frameId = frameId;
root.Frame = Frame;
root.windowIsFocused = windowIsFocused;
root.bgLog = bgLog;
// These are exported for normal mode and link-hints mode.
extend(root, { focusThisFrame });
// These are exported only for the tests.
extend(root, { installModes });
if (typeof exports === 'undefined' || exports === null) { extend(window, root); }
