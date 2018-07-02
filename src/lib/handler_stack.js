/* eslint-disable
    class-methods-use-this,
    consistent-return,
    default-case,
    max-len,
    no-console,
    no-nested-ternary,
    no-new-object,
    no-param-reassign,
    no-plusplus,
    no-restricted-syntax,
    no-return-assign,
    no-undef,
    no-underscore-dangle,
    no-unused-expressions,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const root = typeof exports !== 'undefined' && exports !== null ? exports : (window.root != null ? window.root : (window.root = {}));

class HandlerStack {
  constructor() {
    this.debug = false;
    this.eventNumber = 0;
    this.stack = [];
    this.counter = 0;

    // A handler should return this value to immediately discontinue bubbling and pass the event on to the
    // underlying page.
    this.passEventToPage = new Object();

    // A handler should return this value to indicate that the event has been consumed, and no further
    // processing should take place.  The event does not propagate to the underlying page.
    this.suppressPropagation = new Object();

    // A handler should return this value to indicate that bubbling should be restarted.  Typically, this is
    // used when, while bubbling an event, a new mode is pushed onto the stack.
    this.restartBubbling = new Object();

    // A handler should return this value to continue bubbling the event.
    this.continueBubbling = true;

    // A handler should return this value to suppress an event.
    this.suppressEvent = false;
  }

  // Adds a handler to the top of the stack. Returns a unique ID for that handler that can be used to remove it
  // later.
  push(handler) {
    if (!handler._name) { handler._name = `anon-${this.counter}`; }
    this.stack.push(handler);
    return handler.id = ++this.counter;
  }

  // As above, except the new handler is added to the bottom of the stack.
  unshift(handler) {
    if (!handler._name) { handler._name = `anon-${this.counter}`; }
    handler._name += '/unshift';
    this.stack.unshift(handler);
    return handler.id = ++this.counter;
  }

  // Called whenever we receive a key or other event. Each individual handler has the option to stop the
  // event's propagation by returning a falsy value, or stop bubbling by returning @suppressPropagation or
  // @passEventToPage.
  bubbleEvent(type, event) {
    this.eventNumber += 1;
    const { eventNumber } = this;
    for (const handler of Array.from(this.stack.slice().reverse())) {
      // A handler might have been removed (handler.id == null), so check; or there might just be no handler
      // for this type of event.
      if (!(handler != null ? handler.id : undefined) || !handler[type]) {
        if (this.debug) { this.logResult(eventNumber, type, event, handler, `skip [${(handler[type] != null)}]`); }
      } else {
        this.currentId = handler.id;
        const result = handler[type].call(this, event);
        if (this.debug) { this.logResult(eventNumber, type, event, handler, result); }
        if (result === this.passEventToPage) {
          return true;
        } if (result === this.suppressPropagation) {
          if (type === 'keydown') {
            DomUtils.consumeKeyup(event, null, true);
          } else {
            DomUtils.suppressPropagation(event);
          }
          return false;
        } if (result === this.restartBubbling) {
          return this.bubbleEvent(type, event);
        } if ((result === this.continueBubbling) || (result && (result !== this.suppressEvent))) {
          true; // Do nothing, but continue bubbling.
        } else {
          // result is @suppressEvent or falsy.
          if (this.isChromeEvent(event)) {
            if (type === 'keydown') {
              DomUtils.consumeKeyup(event);
            } else {
              DomUtils.suppressEvent(event);
            }
          }
          return false;
        }
      }
    }

    // None of our handlers care about this event, so pass it to the page.
    return true;
  }

  remove(id) {
    if (id == null) { id = this.currentId; }
    return (() => {
      const result = [];
      for (let i = this.stack.length - 1; i >= 0; i--) {
        const handler = this.stack[i];
        if (handler.id === id) {
          // Mark the handler as removed.
          handler.id = null;
          this.stack.splice(i, 1);
          break;
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }

  // The handler stack handles chrome events (which may need to be suppressed) and internal (pseudo) events.
  // This checks whether the event at hand is a chrome event.
  isChromeEvent(event) {
    return ((event != null ? event.preventDefault : undefined) != null) || ((event != null ? event.stopImmediatePropagation : undefined) != null);
  }

  // Convenience wrappers.  Handlers must return an approriate value.  These are wrappers which handlers can
  // use to always return the same value.  This then means that the handler itself can be implemented without
  // regard to its return value.
  alwaysContinueBubbling(handler = null) {
    if (typeof handler === 'function') {
      handler();
    }
    return this.continueBubbling;
  }

  alwaysSuppressPropagation(handler = null) {
    if ((typeof handler === 'function' ? handler() : undefined) === this.suppressEvent) { return this.suppressEvent; } return this.suppressPropagation;
  }

  // Debugging.
  logResult(eventNumber, type, event, handler, result) {
    if ((event != null ? event.type : undefined) === 'keydown') { // Tweak this as needed.
      let label = (() => {
        switch (result) {
          case this.passEventToPage: return 'passEventToPage';
          case this.suppressEvent: return 'suppressEvent';
          case this.suppressPropagation: return 'suppressPropagation';
          case this.restartBubbling: return 'restartBubbling';
          case 'skip': return 'skip';
          case true: return 'continue';
        }
      })();
      if (!label) { label = result ? 'continue/truthy' : 'suppress'; }
      return console.log(`${eventNumber}`, type, handler._name, label);
    }
  }

  show() {
    console.log(`${this.eventNumber}:`);
    return Array.from(this.stack.slice().reverse()).map(handler => console.log('  ', handler._name));
  }

  // For tests only.
  reset() {
    return this.stack = [];
  }
}

root.HandlerStack = HandlerStack;
root.handlerStack = new HandlerStack();
if (typeof exports === 'undefined' || exports === null) { extend(window, root); }
