"use stric";
module.exports = function(html, jqueryUrl, callback) {
  var jsdom = require('jsdom');
  var window = jsdom.jsdom(html).parentWindow;
  jsdom.jQueryify(window, jqueryUrl, function(window, $$) {
    callback($$);
  });
};
