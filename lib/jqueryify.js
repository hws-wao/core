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
  var opt =  { features: { ProcessExternalResources: false, FetchExternalResources: false }};
  var window = jsdom.jsdom(html, null, opt).parentWindow; // dom作成(jsは実行しない)
  // jQuery生成（jsを実行する）
  window.document.implementation.addFeature('FetchExternalResources', ['script']);
  window.document.implementation.addFeature('ProcessExternalResources', ['script']);
  jsdom.jQueryify(window, jqueryUrl, function(window, $$) {
    $$('body').append('<script type="text/javascript" data-wao="remove">'+jsStrings+'</script>');
    callback($$);
    // 今後はjQueryでjsが追加されても実行しない
    window.document.implementation._addFeature('FetchExternalResources', null);
    window.document.implementation._addFeature('ProcessExternalResources', null);
  });
};
