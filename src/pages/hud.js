/* eslint-disable
    consistent-return,
    func-names,
    max-len,
    no-cond-assign,
    no-param-reassign,
    no-return-assign,
    no-undef,
    no-underscore-dangle,
    no-unused-vars,
    no-use-before-define,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let findMode = null;

// Set the input element's text, and move the cursor to the end.
const setTextInInputElement = function (inputElement, text) {
  inputElement.textContent = text;
  // Move the cursor to the end.  Based on one of the solutions here:
  // http://stackoverflow.com/questions/1125292/how-to-move-cursor-to-end-of-contenteditable-entity
  const range = document.createRange();
  range.selectNodeContents(inputElement);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  return selection.addRange(range);
};

document.addEventListener('DOMContentLoaded', () => DomUtils.injectUserCss()); // Manually inject custom user styles.

const onKeyEvent = function (event) {
  // Handle <Enter> on "keypress", and other events on "keydown"; this avoids interence with CJK translation
  // (see #2915 and #2934).
  let rawQuery;
  if ((event.type === 'keypress') && (event.key !== 'Enter')) { return null; }
  if ((event.type === 'keydown') && (event.key === 'Enter')) { return null; }

  const inputElement = document.getElementById('hud-find-input');
  if (inputElement == null) { return; } // Don't do anything if we're not in find mode.

  if ((KeyboardUtils.isBackspace(event) && (inputElement.textContent.length === 0))
     || (event.key === 'Enter') || KeyboardUtils.isEscape(event)) {
    inputElement.blur();
    UIComponentServer.postMessage({
      name: 'hideFindMode',
      exitEventIsEnter: event.key === 'Enter',
      exitEventIsEscape: KeyboardUtils.isEscape(event),
    });
  } else if (event.key === 'ArrowUp') {
    if (rawQuery = FindModeHistory.getQuery(findMode.historyIndex + 1)) {
      findMode.historyIndex += 1;
      if (findMode.historyIndex === 0) { findMode.partialQuery = findMode.rawQuery; }
      setTextInInputElement(inputElement, rawQuery);
      findMode.executeQuery();
    }
  } else if (event.key === 'ArrowDown') {
    findMode.historyIndex = Math.max(-1, findMode.historyIndex - 1);
    rawQuery = findMode.historyIndex >= 0 ? FindModeHistory.getQuery(findMode.historyIndex) : findMode.partialQuery;
    setTextInInputElement(inputElement, rawQuery);
    findMode.executeQuery();
  } else {
    return;
  }

  DomUtils.suppressEvent(event);
  return false;
};

document.addEventListener('keydown', onKeyEvent);
document.addEventListener('keypress', onKeyEvent);

const handlers = {
  show(data) {
    document.getElementById('hud').innerText = data.text;
    document.getElementById('hud').classList.add('vimiumUIComponentVisible');
    return document.getElementById('hud').classList.remove('vimiumUIComponentHidden');
  },
  hidden() {
    // We get a flicker when the HUD later becomes visible again (with new text) unless we reset its contents
    // here.
    document.getElementById('hud').innerText = '';
    document.getElementById('hud').classList.add('vimiumUIComponentHidden');
    return document.getElementById('hud').classList.remove('vimiumUIComponentVisible');
  },

  showFindMode(data) {
    let executeQuery;
    const hud = document.getElementById('hud');
    hud.innerText = '/\u200A'; // \u200A is a "hair space", to leave enough space before the caret/first char.

    const inputElement = document.createElement('span');
    try { // NOTE(mrmr1993): Chrome supports non-standard "plaintext-only", which is what we *really* want.
      inputElement.contentEditable = 'plaintext-only';
    } catch (error) { // Fallback to standard-compliant version.
      inputElement.contentEditable = 'true';
    }
    inputElement.id = 'hud-find-input';
    hud.appendChild(inputElement);

    inputElement.addEventListener('input', (executeQuery = function (event) {
      // Replace \u00A0 (&nbsp;) with a normal space.
      findMode.rawQuery = inputElement.textContent.replace('\u00A0', ' ');
      return UIComponentServer.postMessage({ name: 'search', query: findMode.rawQuery });
    }));

    const countElement = document.createElement('span');
    countElement.id = 'hud-match-count';
    countElement.style.float = 'right';
    hud.appendChild(countElement);
    inputElement.focus();

    return findMode = {
      historyIndex: -1,
      partialQuery: '',
      rawQuery: '',
      executeQuery,
    };
  },

  updateMatchesCount({ matchCount, showMatchText }) {
    const countElement = document.getElementById('hud-match-count');
    if (countElement == null) { return; } // Don't do anything if we're not in find mode.

    const countText = matchCount > 0
      ? ` (${matchCount} Match${matchCount === 1 ? '' : 'es'})`
      : ' (No matches)';
    return countElement.textContent = showMatchText ? countText : '';
  },

  copyToClipboard(data) {
    const focusedElement = document.activeElement;
    Clipboard.copy(data);
    if (focusedElement != null) {
      focusedElement.focus();
    }
    window.parent.focus();
    return UIComponentServer.postMessage({ name: 'unfocusIfFocused' });
  },

  pasteFromClipboard() {
    const focusedElement = document.activeElement;
    const data = Clipboard.paste();
    if (focusedElement != null) {
      focusedElement.focus();
    }
    window.parent.focus();
    return UIComponentServer.postMessage({ name: 'pasteResponse', data });
  },
};

UIComponentServer.registerHandler(({ data }) => __guardMethod__(handlers, data.name != null ? data.name : data, (o, m) => o[m](data)));
FindModeHistory.init();

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  }
  return undefined;
}
