var config = require('config'),
    jsdom  = require('jsdom');

var serverConfig = config.get('server');
var File         = require('./file');
var App          = require('./app');

var file   = new File({ baseDir: './' }),
    jquery = 'https://code.jquery.com/jquery-2.1.3.js',
    window = jsdom.jsdom('').parentWindow;

module.exports = {
  start: function() {
    jsdom.jQueryify(window, jquery, function(window, $$) {
      global.$ = $$;

      var app = new App({ name: serverConfig.name, port: serverConfig.port });
      app.start();
    });
  }
};

