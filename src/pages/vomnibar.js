/* eslint-disable
    class-methods-use-this,
    consistent-return,
    default-case,
    max-len,
    no-multi-assign,
    no-nested-ternary,
    no-param-reassign,
    no-plusplus,
    no-restricted-syntax,
    no-return-assign,
    no-undef,
    no-underscore-dangle,
    no-use-before-define,
    prefer-destructuring,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//
// This controls the contents of the Vomnibar iframe. We use an iframe to avoid changing the selection on the
// page (useful for bookmarklets), ensure that the Vomnibar style is unaffected by the page, and simplify key
// handling in vimium_frontend.coffee
//
const Vomnibar = {
  vomnibarUI: null, // the dialog instance for this window
  getUI() { return this.vomnibarUI; },
  completers: {},

  getCompleter(name) {
    return this.completers[name] != null ? this.completers[name] : (this.completers[name] = new BackgroundCompleter(name));
  },

  activate(userOptions) {
    const options = {
      completer: 'omni',
      query: '',
      newTab: false,
      selectFirst: false,
      keyword: null,
    };
    extend(options, userOptions);
    extend(options, { refreshInterval: options.completer === 'omni' ? 150 : 0 });

    const completer = this.getCompleter(options.completer);
    if (this.vomnibarUI == null) { this.vomnibarUI = new VomnibarUI(); }
    completer.refresh(this.vomnibarUI);
    this.vomnibarUI.setInitialSelectionValue(options.selectFirst ? 0 : -1);
    this.vomnibarUI.setCompleter(completer);
    this.vomnibarUI.setRefreshInterval(options.refreshInterval);
    this.vomnibarUI.setForceNewTab(options.newTab);
    this.vomnibarUI.setQuery(options.query);
    this.vomnibarUI.setKeyword(options.keyword);
    return this.vomnibarUI.update(true);
  },

  hide() { return (this.vomnibarUI != null ? this.vomnibarUI.hide() : undefined); },
  onHidden() { return (this.vomnibarUI != null ? this.vomnibarUI.onHidden() : undefined); },
};

class VomnibarUI {
  constructor() {
    this.onKeyEvent = this.onKeyEvent.bind(this);
    this.onInput = this.onInput.bind(this);
    this.update = this.update.bind(this);
    this.refreshInterval = 0;
    this.onHiddenCallback = null;
    this.initDom();
  }

  setQuery(query) { return this.input.value = query; }

  setKeyword(keyword) { return this.customSearchMode = keyword; }

  setInitialSelectionValue(initialSelectionValue) {
    this.initialSelectionValue = initialSelectionValue;
  }

  setRefreshInterval(refreshInterval) {
    this.refreshInterval = refreshInterval;
  }

  setForceNewTab(forceNewTab) {
    this.forceNewTab = forceNewTab;
  }

  setCompleter(completer) { this.completer = completer; return this.reset(); }

  setKeywords(keywords) {
    this.keywords = keywords;
  }

  // The sequence of events when the vomnibar is hidden is as follows:
  // 1. Post a "hide" message to the host page.
  // 2. The host page hides the vomnibar.
  // 3. When that page receives the focus, and it posts back a "hidden" message.
  // 3. Only once the "hidden" message is received here is any required action  invoked (in onHidden).
  // This ensures that the vomnibar is actually hidden before any new tab is created, and avoids flicker after
  // opening a link in a new tab then returning to the original tab (see #1485).
  hide(onHiddenCallback = null) {
    this.onHiddenCallback = onHiddenCallback;
    this.input.blur();
    UIComponentServer.postMessage('hide');
    return this.reset();
  }

  onHidden() {
    if (typeof this.onHiddenCallback === 'function') {
      this.onHiddenCallback();
    }
    this.onHiddenCallback = null;
    return this.reset();
  }

  reset() {
    this.clearUpdateTimer();
    this.completionList.style.display = '';
    this.input.value = '';
    this.completions = [];
    this.previousInputValue = null;
    this.customSearchMode = null;
    this.selection = this.initialSelectionValue;
    this.keywords = [];
    this.seenTabToOpenCompletionList = false;
    return (this.completer != null ? this.completer.reset() : undefined);
  }

  updateSelection() {
    // For custom search engines, we suppress the leading term (e.g. the "w" of "w query terms") within the
    // vomnibar input.
    if (this.lastReponse.isCustomSearch && (this.customSearchMode == null)) {
      const queryTerms = this.input.value.trim().split(/\s+/);
      this.customSearchMode = queryTerms[0];
      this.input.value = queryTerms.slice(1).join(' ');
    }

    // For suggestions for custom search engines, we copy the suggested text into the input when the item is
    // selected, and revert when it is not.  This allows the user to select a suggestion and then continue
    // typing.
    if ((this.selection >= 0) && (this.completions[this.selection].insertText != null)) {
      if (this.previousInputValue == null) { this.previousInputValue = this.input.value; }
      this.input.value = this.completions[this.selection].insertText;
    } else if (this.previousInputValue != null) {
      this.input.value = this.previousInputValue;
      this.previousInputValue = null;
    }

    // Highlight the selected entry, and only the selected entry.
    return __range__(0, this.completionList.children.length, false).map(i => (this.completionList.children[i].className = (i === this.selection ? 'vomnibarSelected' : '')));
  }

  // Returns the user's action ("up", "down", "tab", etc, or null) based on their keypress.  We support the
  // arrow keys and various other shortcuts, and this function hides the event-decoding complexity.
  actionFromKeyEvent(event) {
    const key = KeyboardUtils.getKeyChar(event);
    // Handle <Enter> on "keypress", and other events on "keydown"; this avoids interence with CJK translation
    // (see #2915 and #2934).
    if ((event.type === 'keypress') && (key !== 'enter')) { return null; }
    if ((event.type === 'keydown') && (key === 'enter')) { return null; }
    if (KeyboardUtils.isEscape(event)) {
      return 'dismiss';
    } if ((key === 'up')
        || (event.shiftKey && (event.key === 'Tab'))
        || (event.ctrlKey && ((key === 'k') || (key === 'p')))) {
      return 'up';
    } if ((event.key === 'Tab') && !event.shiftKey) {
      return 'tab';
    } if ((key === 'down')
        || (event.ctrlKey && ((key === 'j') || (key === 'n')))) {
      return 'down';
    } if (event.key === 'Enter') {
      return 'enter';
    } if (KeyboardUtils.isBackspace(event)) {
      return 'delete';
    }

    return null;
  }

  onKeyEvent(event) {
    let action;
    this.lastAction = (action = this.actionFromKeyEvent(event));
    if (!action) { return true; } // pass through

    const openInNewTab = this.forceNewTab || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey;
    if (action === 'dismiss') {
      this.hide();
    } else if (['tab', 'down'].includes(action)) {
      if ((action === 'tab')
        && (this.completer.name === 'omni')
        && !this.seenTabToOpenCompletionList
        && (this.input.value.trim().length === 0)) {
        this.seenTabToOpenCompletionList = true;
        this.update(true);
      } else if (this.completions.length > 0) {
        this.selection += 1;
        if (this.selection === this.completions.length) { this.selection = this.initialSelectionValue; }
        this.updateSelection();
      }
    } else if (action === 'up') {
      this.selection -= 1;
      if (this.selection < this.initialSelectionValue) { this.selection = this.completions.length - 1; }
      this.updateSelection();
    } else if (action === 'enter') {
      const isCustomSearchPrimarySuggestion = (this.completions[this.selection] != null ? this.completions[this.selection].isPrimarySuggestion : undefined) && ((this.lastReponse.engine != null ? this.lastReponse.engine.searchUrl : undefined) != null);
      if ((this.selection === -1) || isCustomSearchPrimarySuggestion) {
        let query = this.input.value.trim();
        // <Enter> on an empty query is a no-op.
        if (!(query.length > 0)) { return; }
        // First case (@selection == -1).
        // If the user types something and hits enter without selecting a completion from the list, then:
        //   - If a search URL has been provided, then use it.  This is custom search engine request.
        //   - Otherwise, send the query to the background page, which will open it as a URL or create a
        //     default search, as appropriate.
        //
        // Second case (isCustomSearchPrimarySuggestion).
        // Alternatively, the selected completion could be the primary selection for a custom search engine.
        // Because the the suggestions are updated asynchronously in omni mode, the user may have typed more
        // text than that which is included in the URL associated with the primary suggestion.  Therefore, to
        // avoid a race condition, we construct the query from the actual contents of the input (query).
        if (isCustomSearchPrimarySuggestion) { query = Utils.createSearchUrl(query, this.lastReponse.engine.searchUrl); }
        this.hide(() => Vomnibar.getCompleter().launchUrl(query, openInNewTab));
      } else {
        const completion = this.completions[this.selection];
        this.hide(() => completion.performAction(openInNewTab));
      }
    } else if (action === 'delete') {
      if ((this.customSearchMode != null) && (this.input.selectionEnd === 0)) {
        // Normally, with custom search engines, the keyword (e,g, the "w" of "w query terms") is suppressed.
        // If the cursor is at the start of the input, then reinstate the keyword (the "w").
        this.input.value = this.customSearchMode + this.input.value.ltrim();
        this.input.selectionStart = (this.input.selectionEnd = this.customSearchMode.length);
        this.customSearchMode = null;
        this.update(true);
      } else if (this.seenTabToOpenCompletionList && (this.input.value.trim().length === 0)) {
        this.seenTabToOpenCompletionList = false;
        this.update(true);
      } else {
        return true; // Do not suppress event.
      }
    }

    // It seems like we have to manually suppress the event here and still return true.
    event.stopImmediatePropagation();
    event.preventDefault();
    return true;
  }

  // Return the background-page query corresponding to the current input state.  In other words, reinstate any
  // search engine keyword which is currently being suppressed, and strip any prompted text.
  getInputValueAsQuery() {
    return ((this.customSearchMode != null) ? `${this.customSearchMode} ` : '') + this.input.value;
  }

  updateCompletions(callback = null) {
    return this.completer.filter({
      query: this.getInputValueAsQuery(),
      seenTabToOpenCompletionList: this.seenTabToOpenCompletionList,
      callback: (lastReponse) => {
        this.lastReponse = lastReponse;
        const { results } = this.lastReponse;
        this.completions = results;
        this.selection = (this.completions[0] != null ? this.completions[0].autoSelect : undefined) ? 0 : this.initialSelectionValue;
        // Update completion list with the new suggestions.
        this.completionList.innerHTML = this.completions.map(completion => `<li>${completion.html}</li>`).join('');
        this.completionList.style.display = this.completions.length > 0 ? 'block' : '';
        this.selection = Math.min(this.completions.length - 1, Math.max(this.initialSelectionValue, this.selection));
        this.updateSelection();
        return (typeof callback === 'function' ? callback() : undefined);
      },
    });
  }

  onInput() {
    let updateSynchronously;
    this.seenTabToOpenCompletionList = false;
    this.completer.cancel();
    if ((this.selection >= 0) && this.completions[this.selection].customSearchMode && !this.customSearchMode) {
      this.customSearchMode = this.completions[this.selection].customSearchMode;
      updateSynchronously = true;
    }
    // If the user types, then don't reset any previous text, and reset the selection.
    if (this.previousInputValue != null) {
      this.previousInputValue = null;
      this.selection = -1;
    }
    return this.update(updateSynchronously);
  }

  clearUpdateTimer() {
    if (this.updateTimer != null) {
      window.clearTimeout(this.updateTimer);
      return this.updateTimer = null;
    }
  }

  shouldActivateCustomSearchMode() {
    const queryTerms = this.input.value.ltrim().split(/\s+/);
    return (queryTerms.length > 1) && Array.from(this.keywords).includes(queryTerms[0]) && !this.customSearchMode;
  }

  update(updateSynchronously, callback = null) {
    // If the query text becomes a custom search (the user enters a search keyword), then we need to force a
    // synchronous update (so that the state is updated immediately).
    if (updateSynchronously == null) { updateSynchronously = false; }
    if (!updateSynchronously) { updateSynchronously = this.shouldActivateCustomSearchMode(); }
    if (updateSynchronously) {
      this.clearUpdateTimer();
      this.updateCompletions(callback);
    } else if ((this.updateTimer == null)) {
      // Update asynchronously for a better user experience, and to take some load off the CPU (not every
      // keystroke will cause a dedicated update).
      this.updateTimer = Utils.setTimeout(this.refreshInterval, () => {
        this.updateTimer = null;
        return this.updateCompletions(callback);
      });
    }

    return this.input.focus();
  }

  initDom() {
    this.box = document.getElementById('vomnibar');

    this.input = this.box.querySelector('input');
    this.input.addEventListener('input', this.onInput);
    this.input.addEventListener('keydown', this.onKeyEvent);
    this.input.addEventListener('keypress', this.onKeyEvent);
    this.completionList = this.box.querySelector('ul');
    this.completionList.style.display = '';

    window.addEventListener('focus', () => this.input.focus());
    // A click in the vomnibar itself refocuses the input.
    this.box.addEventListener('click', (event) => {
      this.input.focus();
      return event.stopImmediatePropagation();
    });
    // A click anywhere else hides the vomnibar.
    return document.body.addEventListener('click', () => this.hide());
  }
}

//
// Sends requests to a Vomnibox completer on the background page.
//
class BackgroundCompleter {
  static initClass() {
    // These are the actions we can perform when the user selects a result.
    this.prototype.completionActions = {
      navigateToUrl(url) { return openInNewTab => Vomnibar.getCompleter().launchUrl(url, openInNewTab); },

      switchToTab(tabId) { return () => chrome.runtime.sendMessage({ handler: 'selectSpecificTab', id: tabId }); },
    };
  }

  // The "name" is the background-page completer to connect to: "omni", "tabs", or "bookmarks".
  constructor(name) {
    this.name = name;
    this.port = chrome.runtime.connect({ name: 'completions' });
    this.messageId = null;
    this.reset();

    this.port.onMessage.addListener((msg) => {
      switch (msg.handler) {
        case 'keywords':
          this.keywords = msg.keywords;
          return this.lastUI.setKeywords(this.keywords);
        case 'completions':
          if (msg.id === this.messageId) {
            // The result objects coming from the background page will be of the form:
            //   { html: "", type: "", url: "", ... }
            // Type will be one of [tab, bookmark, history, domain, search], or a custom search engine description.
            for (const result of Array.from(msg.results)) {
              extend(result, {
                performAction:
                  result.type === 'tab'
                    ? this.completionActions.switchToTab(result.tabId)
                    : this.completionActions.navigateToUrl(result.url),
              });
            }

            // Handle the message, but only if it hasn't arrived too late.
            return this.mostRecentCallback(msg);
          }
          break;
      }
    });
  }

  filter(request) {
    const { query, callback } = request;
    this.mostRecentCallback = callback;

    return this.port.postMessage(extend(request, {
      handler: 'filter',
      name: this.name,
      id: (this.messageId = Utils.createUniqueId()),
      queryTerms: query.trim().split(/\s+/).filter(s => s.length > 0),
      // We don't send these keys.
      callback: null,
    }));
  }

  reset() {
    return this.keywords = [];
  }

  refresh(lastUI) {
    this.lastUI = lastUI;
    this.reset();
    return this.port.postMessage({ name: this.name, handler: 'refresh' });
  }

  cancel() {
    // Inform the background completer that it may (should it choose to do so) abandon any pending query
    // (because the user is typing, and there will be another query along soon).
    return this.port.postMessage({ name: this.name, handler: 'cancel' });
  }

  launchUrl(url, openInNewTab) {
    // If the URL is a bookmarklet (so, prefixed with "javascript:"), then we always open it in the current
    // tab.
    if (openInNewTab) { openInNewTab = !Utils.hasJavascriptPrefix(url); }
    return chrome.runtime.sendMessage({
      handler: openInNewTab ? 'openUrlInNewTab' : 'openUrlInCurrentTab',
      url,
    });
  }
}
BackgroundCompleter.initClass();

UIComponentServer.registerHandler((event) => {
  switch (event.data.name != null ? event.data.name : event.data) {
    case 'hide': return Vomnibar.hide();
    case 'hidden': return Vomnibar.onHidden();
    case 'activate': return Vomnibar.activate(event.data);
  }
});

document.addEventListener('DOMContentLoaded', () => DomUtils.injectUserCss()); // Manually inject custom user styles.

const root = typeof exports !== 'undefined' && exports !== null ? exports : window;
root.Vomnibar = Vomnibar;

function __range__(left, right, inclusive) {
  const range = [];
  const ascending = left < right;
  const end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}
