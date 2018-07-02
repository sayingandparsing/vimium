/* eslint-disable
    class-methods-use-this,
    constructor-super,
    max-len,
    no-cond-assign,
    no-constant-condition,
    no-continue,
    no-eval,
    no-restricted-syntax,
    no-this-before-super,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

// A completion engine provides search suggestions for a custom search engine.  A custom search engine is
// identified by a "searchUrl".  An "engineUrl" is used for fetching suggestions, whereas a "searchUrl" is used
// for the actual search itself.
//
// Each completion engine defines:
//
//   1. An "engineUrl". This is the URL to use for search completions and is passed as the option "engineUrl"
//      to the "BaseEngine" constructor.
//
//   2. One or more regular expressions which define the custom search engine URLs for which the completion
//      engine will be used. This is passed as the "regexps" option to the "BaseEngine" constructor.
//
//   3. A "parse" function. This takes a successful XMLHttpRequest object (the request has completed
//      successfully), and returns a list of suggestions (a list of strings).  This method is always executed
//      within the context of a try/catch block, so errors do not propagate.
//
//   4. Each completion engine *must* include an example custom search engine.  The example must include an
//      example "keyword" and an example "searchUrl", and may include an example "description" and an
//      "explanation".
//
// Each new completion engine must be added to the list "CompletionEngines" at the bottom of this file.
//
// The lookup logic which uses these completion engines is in "./completion_search.coffee".
//

// A base class for common regexp-based matching engines. "options" must define:
//   options.engineUrl: the URL to use for the completion engine. This must be a string.
//   options.regexps: one or regular expressions.  This may either a single string or a list of strings.
//   options.example: an example object containing at least "keyword" and "searchUrl", and optional "description".
class BaseEngine {
  constructor(options) {
    extend(this, options);
    if (typeof this.regexps === 'string') { this.regexps = [this.regexps]; }
    this.regexps = this.regexps.map(regexp => new RegExp(regexp));
  }

  match(searchUrl) { return Utils.matchesAnyRegexp(this.regexps, searchUrl); }

  getUrl(queryTerms) { return Utils.createSearchUrl(queryTerms, this.engineUrl); }
}

// Several Google completion engines package responses as XML. This parses such XML.
class GoogleXMLBaseEngine extends BaseEngine {
  parse(xhr) {
    return (() => {
      const result = [];
      for (let suggestion of Array.from(xhr.responseXML.getElementsByTagName('suggestion'))) {
        if (!(suggestion = suggestion.getAttribute('data'))) { continue; }
        result.push(suggestion);
      }
      return result;
    })();
  }
}

class Google extends GoogleXMLBaseEngine {
  constructor() {
    super({
      engineUrl: 'https://suggestqueries.google.com/complete/search?ss_protocol=legace&client=toolbar&q=%s',
      regexps: '^https?://[a-z]+\\.google\\.(com|ie|co\\.(uk|jp)|ca|com\\.au)/',
      example: {
        searchUrl: 'https://www.google.com/search?q=%s',
        keyword: 'g',
      },
    });
  }
}

class GoogleMaps extends GoogleXMLBaseEngine {
  static initClass() {
    this.prototype.prefix = 'map of ';
  }

  constructor() {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      const thisFn = (() => this).toString();
      const thisName = thisFn.slice(thisFn.indexOf('return') + 6 + 1, thisFn.indexOf(';')).trim();
      eval(`${thisName} = this;`);
    }
    super({
      engineUrl: `https://suggestqueries.google.com/complete/search?ss_protocol=legace&client=toolbar&q=${this.prefix.split(' ').join('+')}%s`,
      regexps: '^https?://[a-z]+\\.google\\.(com|ie|co\\.(uk|jp)|ca|com\\.au)/maps',
      example: {
        searchUrl: 'https://www.google.com/maps?q=%s',
        keyword: 'm',
        explanation:
          `\
This uses regular Google completion, but prepends the text "<tt>map of</tt>" to the query.  It works
well for places, countries, states, geographical regions and the like, but will not perform address
search.\
`,
      },
    });
  }

  parse(xhr) {
    return (() => {
      const result = [];
      for (const suggestion of Array.from(super.parse(xhr))) {
        if (!suggestion.startsWith(this.prefix)) { continue; }
        result.push(suggestion.slice(this.prefix.length));
      }
      return result;
    })();
  }
}
GoogleMaps.initClass();

class Youtube extends GoogleXMLBaseEngine {
  constructor() {
    super({
      engineUrl: 'https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&xml=t&q=%s',
      regexps: '^https?://[a-z]+\\.youtube\\.com/results',
      example: {
        searchUrl: 'https://www.youtube.com/results?search_query=%s',
        keyword: 'y',
      },
    });
  }
}

class Wikipedia extends BaseEngine {
  constructor() {
    super({
      engineUrl: 'https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=%s',
      regexps: '^https?://[a-z]+\\.wikipedia\\.org/',
      example: {
        searchUrl: 'https://www.wikipedia.org/w/index.php?title=Special:Search&search=%s',
        keyword: 'w',
      },
    });
  }

  parse(xhr) { return JSON.parse(xhr.responseText)[1]; }
}

class Bing extends BaseEngine {
  constructor() {
    super({
      engineUrl: 'https://api.bing.com/osjson.aspx?query=%s',
      regexps: '^https?://www\\.bing\\.com/search',
      example: {
        searchUrl: 'https://www.bing.com/search?q=%s',
        keyword: 'b',
      },
    });
  }

  parse(xhr) { return JSON.parse(xhr.responseText)[1]; }
}

class Amazon extends BaseEngine {
  constructor() {
    super({
      engineUrl: 'https://completion.amazon.com/search/complete?method=completion&search-alias=aps&client=amazon-search-ui&mkt=1&q=%s',
      regexps: '^https?://www\\.amazon\\.(com|co\\.uk|ca|de|com\\.au)/s/',
      example: {
        searchUrl: 'https://www.amazon.com/s/?field-keywords=%s',
        keyword: 'a',
      },
    });
  }

  parse(xhr) { return JSON.parse(xhr.responseText)[1]; }
}

class AmazonJapan extends BaseEngine {
  constructor() {
    super({
      engineUrl: 'https://completion.amazon.co.jp/search/complete?method=completion&search-alias=aps&client=amazon-search-ui&mkt=6&q=%s',
      regexps: '^https?://www\\.amazon\\.co\\.jp/(s/|gp/search)',
      example: {
        searchUrl: 'https://www.amazon.co.jp/s/?field-keywords=%s',
        keyword: 'aj',
      },
    });
  }

  parse(xhr) { return JSON.parse(xhr.responseText)[1]; }
}

class DuckDuckGo extends BaseEngine {
  constructor() {
    super({
      engineUrl: 'https://duckduckgo.com/ac/?q=%s',
      regexps: '^https?://([a-z]+\\.)?duckduckgo\\.com/',
      example: {
        searchUrl: 'https://duckduckgo.com/?q=%s',
        keyword: 'd',
      },
    });
  }

  parse(xhr) {
    return Array.from(JSON.parse(xhr.responseText)).map(suggestion => suggestion.phrase);
  }
}

class Webster extends BaseEngine {
  constructor() {
    super({
      engineUrl: 'https://www.merriam-webster.com/autocomplete?query=%s',
      regexps: '^https?://www.merriam-webster.com/dictionary/',
      example: {
        searchUrl: 'https://www.merriam-webster.com/dictionary/%s',
        keyword: 'dw',
        description: 'Dictionary',
      },
    });
  }

  parse(xhr) { return JSON.parse(xhr.responseText).suggestions; }
}

class Qwant extends BaseEngine {
  constructor() {
    super({
      engineUrl: 'https://api.qwant.com/api/suggest?q=%s',
      regexps: '^https?://www\\.qwant\\.com/',
      example: {
        searchUrl: 'https://www.qwant.com/?q=%s',
        keyword: 'qw',
      },
    });
  }

  parse(xhr) {
    return Array.from(JSON.parse(xhr.responseText).data.items).map(suggestion => suggestion.value);
  }
}

class UpToDate extends BaseEngine {
  constructor() {
    super({
      engineUrl: 'https://www.uptodate.com/services/app/contents/search/autocomplete/json?term=%s&limit=10',
      regexps: '^https?://www\\.uptodate\\.com/',
      example: {
        searchUrl: 'https://www.uptodate.com/contents/search?search=%s&searchType=PLAIN_TEXT&source=USER_INPUT&searchControl=TOP_PULLDOWN&autoComplete=false',
        keyword: 'upto',
      },
    });
  }

  parse(xhr) { return JSON.parse(xhr.responseText).data.searchTerms; }
}

// A dummy search engine which is guaranteed to match any search URL, but never produces completions.  This
// allows the rest of the logic to be written knowing that there will always be a completion engine match.
class DummyCompletionEngine extends BaseEngine {
  constructor() {
    super({
      regexps: '.',
      dummy: true,
    });
  }
}

// Note: Order matters here.
const CompletionEngines = [
  Youtube,
  GoogleMaps,
  Google,
  DuckDuckGo,
  Wikipedia,
  Bing,
  Amazon,
  AmazonJapan,
  Webster,
  Qwant,
  UpToDate,
  DummyCompletionEngine,
];

const root = typeof exports !== 'undefined' && exports !== null ? exports : window;
root.CompletionEngines = CompletionEngines;
