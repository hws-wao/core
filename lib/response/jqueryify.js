"use stric";
var jsStrings = '';
(function() {
  var File = require('../dao/file_dao');
  var file   = new File({ baseDir: './lib/client/' });
  var jsFileNames = ['wao-bind'];
  for (var i in jsFileNames) {
    jsStrings += '\n'+file.read({ path: jsFileNames[i]+'.js'});
  }
})();

module.exports = function(html, appId, jqueryUrl, callback) {
  var jsdom = require('jsdom');
  var window = jsdom.jsdom(html).parentWindow;
  jsdom.jQueryify(window, jqueryUrl, function(window, $$) {
    var $myScript = $$('script[src*="_LOCAL/exec_at_server/"]');
    if ($myScript) {
      var File = require('../dao/file_dao');
      var file   = new File({ baseDir: './apps/' + appId + '/templates/_LOCAL/exec_at_server/' });
      $myScript.each(function() {
        var filename = $(this).attr('src').replace(/^.*_LOCAL\/exec_at_server\//, '');
        jsStrings += '\n'+file.read({ path: filename });
      });
    }
    $$('body').append('<script type="text/javascript" data-wao="remove">'+jsStrings+'</script>');
    callback($$);
    window.document.implementation._addFeature('FetchExternalResources', null);
    window.document.implementation._addFeature('ProcessExternalResources', null);
  });
};
