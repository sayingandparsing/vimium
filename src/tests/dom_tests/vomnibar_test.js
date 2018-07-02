/* eslint-disable
    func-names,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let vomnibarFrame = null;
Vomnibar.init();

context('Keep selection within bounds',

  setup(function () {
    this.completions = [];

    vomnibarFrame = Vomnibar.vomnibarUI.iframeElement.contentWindow;

    // The Vomnibar frame is dynamically injected, so inject our stubs here.
    vomnibarFrame.Function.prototype.bind = Function.prototype.bind;
    vomnibarFrame.chrome = chrome;

    const oldGetCompleter = vomnibarFrame.Vomnibar.getCompleter.bind(vomnibarFrame.Vomnibar);
    stub(vomnibarFrame.Vomnibar, 'getCompleter', (name) => {
      const completer = oldGetCompleter(name);
      stub(completer, 'filter', ({ callback }) => callback({ results: this.completions }));
      return completer;
    });

    // Shoulda.js doesn't support async tests, so we have to hack around.
    stub(Vomnibar.vomnibarUI, 'hide', () => {});
    stub(Vomnibar.vomnibarUI, 'postMessage', data => vomnibarFrame.UIComponentServer.handleMessage({ data }));
    return stub(vomnibarFrame.UIComponentServer, 'postMessage', data => UIComponent.handleMessage({ data }));
  }),

  tearDown(() => Vomnibar.vomnibarUI.hide()),

  should('set selection to position -1 for omni completion by default', function () {
    Vomnibar.activate(0, { options: {} });
    const ui = vomnibarFrame.Vomnibar.vomnibarUI;

    this.completions = [];
    ui.update(true);
    assert.equal(-1, ui.selection);

    this.completions = [{ html: 'foo', type: 'tab', url: 'http://example.com' }];
    ui.update(true);
    assert.equal(-1, ui.selection);

    this.completions = [];
    ui.update(true);
    return assert.equal(-1, ui.selection);
  }),

  should('set selection to position 0 for bookmark completion if possible', function () {
    Vomnibar.activateBookmarks();
    const ui = vomnibarFrame.Vomnibar.vomnibarUI;

    this.completions = [];
    ui.update(true);
    assert.equal(-1, ui.selection);

    this.completions = [{ html: 'foo', type: 'bookmark', url: 'http://example.com' }];
    ui.update(true);
    assert.equal(0, ui.selection);

    this.completions = [];
    ui.update(true);
    return assert.equal(-1, ui.selection);
  }),

  should('keep selection within bounds', function () {
    Vomnibar.activate(0, { options: {} });
    const ui = vomnibarFrame.Vomnibar.vomnibarUI;

    this.completions = [];
    ui.update(true);

    const eventMock = {
      preventDefault() {},
      stopImmediatePropagation() {},
    };

    this.completions = [{ html: 'foo', type: 'tab', url: 'http://example.com' }];
    ui.update(true);
    stub(ui, 'actionFromKeyEvent', () => 'down');
    ui.onKeyEvent(eventMock);
    assert.equal(0, ui.selection);

    this.completions = [];
    ui.update(true);
    return assert.equal(-1, ui.selection);
  }));