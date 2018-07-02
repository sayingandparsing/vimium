/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//
// This wraps the vomnibar iframe, which we inject into the page to provide the vomnibar.
//
const Vomnibar = {
  vomnibarUI: null,

  // Extract any additional options from the command's registry entry.
  extractOptionsFromRegistryEntry(registryEntry, callback) {
    return (typeof callback === 'function' ? callback(extend({}, registryEntry.options)) : undefined);
  },

  // sourceFrameId here (and below) is the ID of the frame from which this request originates, which may be different
  // from the current frame.

  activate(sourceFrameId, registryEntry) {
    return this.extractOptionsFromRegistryEntry(registryEntry, options => {
      return this.open(sourceFrameId, extend(options, {completer:"omni"}));
    });
  },

  activateInNewTab(sourceFrameId, registryEntry) {
    return this.extractOptionsFromRegistryEntry(registryEntry, options => {
      return this.open(sourceFrameId, extend(options, {completer:"omni", newTab: true}));
    });
  },

  activateTabSelection(sourceFrameId) { return this.open(sourceFrameId, {
    completer: "tabs",
    selectFirst: true
  }); },
  activateBookmarks(sourceFrameId) { return this.open(sourceFrameId, {
    completer: "bookmarks",
    selectFirst: true
  }); },
  activateBookmarksInNewTab(sourceFrameId) { return this.open(sourceFrameId, {
    completer: "bookmarks",
    selectFirst: true,
    newTab: true
  }); },
  activateEditUrl(sourceFrameId) { return this.open(sourceFrameId, {
    completer: "omni",
    selectFirst: false,
    query: window.location.href
  }); },
  activateEditUrlInNewTab(sourceFrameId) { return this.open(sourceFrameId, {
    completer: "omni",
    selectFirst: false,
    query: window.location.href,
    newTab: true
  }); },

  init() {
    return this.vomnibarUI != null ? this.vomnibarUI : (this.vomnibarUI = new UIComponent("pages/vomnibar.html", "vomnibarFrame", function() {}));
  },

  // This function opens the vomnibar. It accepts options, a map with the values:
  //   completer   - The completer to fetch results from.
  //   query       - Optional. Text to prefill the Vomnibar with.
  //   selectFirst - Optional, boolean. Whether to select the first entry.
  //   newTab      - Optional, boolean. Whether to open the result in a new tab.
  open(sourceFrameId, options) {
    this.init();
    // The Vomnibar cannot coexist with the help dialog (it causes focus issues).
    HelpDialog.abort();
    return this.vomnibarUI.activate(extend(options, { name: "activate", sourceFrameId, focus: true }));
  }
};

const root = typeof exports !== 'undefined' && exports !== null ? exports : (window.root != null ? window.root : (window.root = {}));
root.Vomnibar = Vomnibar;
if (typeof exports === 'undefined' || exports === null) { extend(window, root); }
