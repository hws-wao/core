'use stric';

var fs = require('fs');
var jsStrings = '';

(function() {
  var jsFileNames = ['wao-bind'];
  for (var i in jsFileNames) {
    jsStrings += fs.readFileSync('./lib/client/' + jsFileNames[i] + '.js');
  }
})();

module.exports = function(html, appId, jqueryUrl, callback) {
  var jsdom = require('jsdom');
  var window = jsdom.jsdom(html).parentWindow;
  jsdom.jQueryify(window, jqueryUrl, function(window, $$) {
    var $myScript = $$('script[src*="_LOCAL/exec_at_server/"]');
    if ($myScript) {
      var baseDir = './apps/' + appId + '/templates/_LOCAL/exec_at_server/';
      $myScript.each(function() {
        var filename = $(this).attr('src').replace(/^.*_LOCAL\/exec_at_server\//, '');
        jsStrings += '\n' + fs.readFileSync(baseDir + filename);
      });
    }
    $$('body').append('<script type="text/javascript" data-wao="remove">'+jsStrings+'</script>');
    callback($$);
    window.document.implementation._addFeature('FetchExternalResources', null);
    window.document.implementation._addFeature('ProcessExternalResources', null);
  });
};
