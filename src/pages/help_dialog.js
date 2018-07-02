/* eslint-disable
    consistent-return,
    default-case,
    func-names,
    max-len,
    no-loop-func,
    no-multi-assign,
    no-param-reassign,
    no-restricted-syntax,
    no-return-assign,
    no-undef,
    no-useless-escape,
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
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const $ = id => document.getElementById(id);
const $$ = (element, selector) => element.querySelector(selector);

// The ordering we show key bindings is alphanumerical, except that special keys sort to the end.
const compareKeys = function (a, b) {
  a = a.replace('<', '~');
  b = b.replace('<', '~');
  if (a < b) { return -1; } if (b < a) { return 1; } return 0;
};

// This overrides the HelpDialog implementation in vimium_frontend.coffee.  We provide aliases for the two
// HelpDialog methods required by normalMode (isShowing() and toggle()).
var HelpDialog = {
  dialogElement: null,
  isShowing() { return true; },

  // This setting is pulled out of local storage. It's false by default.
  getShowAdvancedCommands() { return Settings.get('helpDialog_showAdvancedCommands'); },

  init() {
    if (this.dialogElement != null) { return; }
    this.dialogElement = document.getElementById('vimiumHelpDialog');

    this.dialogElement.getElementsByClassName('closeButton')[0].addEventListener('click', (clickEvent) => {
      clickEvent.preventDefault();
      return this.hide();
    },
    false);
    document.getElementById('helpDialogOptionsPage').addEventListener('click', (clickEvent) => {
      clickEvent.preventDefault();
      return chrome.runtime.sendMessage({ handler: 'openOptionsPageInNewTab' });
    },
    false);
    document.getElementById('toggleAdvancedCommands').addEventListener('click',
      HelpDialog.toggleAdvancedCommands.bind(HelpDialog), false);

    return document.documentElement.addEventListener('click', (event) => {
      if (!this.dialogElement.contains(event.target)) { return this.hide(); }
    },
    false);
  },

  instantiateHtmlTemplate(parentNode, templateId, callback) {
    const templateContent = document.querySelector(templateId).content;
    const node = document.importNode(templateContent, true);
    parentNode.appendChild(node);
    return callback(parentNode.lastElementChild);
  },

  show({ showAllCommandDetails }) {
    $('help-dialog-title').textContent = showAllCommandDetails ? 'Command Listing' : 'Help';
    $('help-dialog-version').textContent = Utils.getCurrentVersion();

    return chrome.storage.local.get('helpPageData', ({ helpPageData }) => {
      for (const group of Object.keys(helpPageData || {})) {
        const commands = helpPageData[group];
        const container = this.dialogElement.querySelector(`#help-dialog-${group}`);
        container.innerHTML = '';
        for (var command of Array.from(commands)) {
          if (showAllCommandDetails || (command.keys.length > 0)) {
            let keysElement = null;
            let descriptionElement = null;

            const useTwoRows = command.keys.join(', ').length >= 12;
            if (!useTwoRows) {
              this.instantiateHtmlTemplate(container, '#helpDialogEntry', (element) => {
                if (command.advanced) { element.classList.add('advanced'); }
                return keysElement = (descriptionElement = element);
              });
            } else {
              this.instantiateHtmlTemplate(container, '#helpDialogEntryBindingsOnly', (element) => {
                if (command.advanced) { element.classList.add('advanced'); }
                return keysElement = element;
              });
              this.instantiateHtmlTemplate(container, '#helpDialogEntry', (element) => {
                if (command.advanced) { element.classList.add('advanced'); }
                return descriptionElement = element;
              });
            }

            $$(descriptionElement, '.vimiumHelpDescription').textContent = command.description;

            keysElement = $$(keysElement, '.vimiumKeyBindings');
            let lastElement = null;
            for (var key of Array.from(command.keys.sort(compareKeys))) {
              this.instantiateHtmlTemplate(keysElement, '#keysTemplate', (element) => {
                lastElement = element;
                return $$(element, '.vimiumHelpDialogKey').textContent = key;
              });
            }
            // And strip off the trailing ", ", if necessary.
            if (lastElement) { lastElement.removeChild($$(lastElement, '.commaSeparator')); }

            if (showAllCommandDetails) {
              this.instantiateHtmlTemplate($$(descriptionElement, '.vimiumHelpDescription'), '#commandNameTemplate', (element) => {
                const commandNameElement = $$(element, '.vimiumCopyCommandNameName');
                commandNameElement.textContent = command.command;
                commandNameElement.title = `Click to copy \"${command.command}\" to clipboard.`;
                return commandNameElement.addEventListener('click', () => {
                  HUD.copyToClipboard(commandNameElement.textContent);
                  return HUD.showForDuration(`Yanked ${commandNameElement.textContent}.`, 2000);
                });
              });
            }
          }
        }
      }

      this.showAdvancedCommands(this.getShowAdvancedCommands());

      // "Click" the dialog element (so that it becomes scrollable).
      return DomUtils.simulateClick(this.dialogElement);
    });
  },

  hide() { return UIComponentServer.hide(); },
  toggle() { return this.hide(); },

  //
  // Advanced commands are hidden by default so they don't overwhelm new and casual users.
  //
  toggleAdvancedCommands(event) {
    const vimiumHelpDialogContainer = $('vimiumHelpDialogContainer');
    const scrollHeightBefore = vimiumHelpDialogContainer.scrollHeight;
    event.preventDefault();
    const showAdvanced = HelpDialog.getShowAdvancedCommands();
    HelpDialog.showAdvancedCommands(!showAdvanced);
    Settings.set('helpDialog_showAdvancedCommands', !showAdvanced);
    // Try to keep the "show advanced commands" button in the same scroll position.
    const scrollHeightDelta = vimiumHelpDialogContainer.scrollHeight - scrollHeightBefore;
    if (scrollHeightDelta > 0) { return vimiumHelpDialogContainer.scrollTop += scrollHeightDelta; }
  },

  showAdvancedCommands(visible) {
    document.getElementById('toggleAdvancedCommands').textContent = visible ? 'Hide advanced commands' : 'Show advanced commands';

    // Add/remove the showAdvanced class to show/hide advanced commands.
    const addOrRemove = visible ? 'add' : 'remove';
    return HelpDialog.dialogElement.classList[addOrRemove]('showAdvanced');
  },
};

UIComponentServer.registerHandler((event) => {
  switch (event.data.name != null ? event.data.name : event.data) {
    case 'hide': return HelpDialog.hide();
    case 'activate':
      HelpDialog.init();
      HelpDialog.show(event.data);
      Frame.postMessage('registerFrame');
      // If we abandoned (see below) in a mode with a HUD indicator, then we have to reinstate it.
      return Mode.setIndicator();
    case 'hidden':
      // Unregister the frame, so that it's not available for `gf` or link hints.
      Frame.postMessage('unregisterFrame');
      // Abandon any HUD which might be showing within the help dialog.
      return HUD.abandon();
  }
});

document.addEventListener('DOMContentLoaded', () => DomUtils.injectUserCss()); // Manually inject custom user styles.

const root = typeof exports !== 'undefined' && exports !== null ? exports : window;
root.HelpDialog = HelpDialog;
root.isVimiumHelpDialog = true;
