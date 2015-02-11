"use stric";
var jsStrings = '';
(function() {
  var File = require('./file');
  var file   = new File({ baseDir: './lib/client/' });
  var jsFileNames = ['wao-bind'];
  for (var i in jsFileNames) {
    jsStrings += '\n'+file.read({ path: jsFileNames[i]+'.js'});
  }
})();

module.exports = function(html, jqueryUrl, callback) {
  var jsdom = require('jsdom');
  var window = jsdom.jsdom(html).parentWindow;
  jsdom.jQueryify(window, jqueryUrl, function(window, $$) {
    $$('body').append('<script type="text/javascript" class="wao">'+jsStrings+'</script>');
    callback($$);
    window.document.implementation._addFeature('FetchExternalResources', null);
    window.document.implementation._addFeature('ProcessExternalResources', null);
  });
};
