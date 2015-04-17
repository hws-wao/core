var config = require('config');
var serverConfig = config.get('server');
var App          = require('./app');

global.JQUERY_URL = 'https://code.jquery.com/jquery-2.1.3.js'; // TODO kimura とりあえず
global._          = require('underscore');

module.exports = {
  apps: [],
  start: function() {
    var that = this;
    var jsdom = require('jsdom');
    var window = jsdom.jsdom('').parentWindow;
    jsdom.jQueryify(window, JQUERY_URL, function(window, $$) {
      global.$ = $$;
      // 同期がうまくいかないのでコールバックで処理する
      global.jqueryify = require('./response/jqueryify');
      var app = new App({ wao: that, name: serverConfig.name, port: serverConfig.port });
      app.start();
      that.apps.push(app);
    });
  },
  createAndStartApp : function(args) {
    if (!this.isAlreadylistenPort(args.port)) {
      var baseDir = args.baseDir || false;
      var app = new App({ wao: this, name: args.name, port: args.port, baseDir: baseDir });
      app.start();
      this.apps.push(app);
      console.log('Start App ' + args.name + ':' + args.port);
    } else {
      console.log('Already listening on port ' + args.port);
    }
  },
  isAlreadylistenPort : function(port) {
    for (var i = 0; i < this.apps.length; i++) {
      if (port == this.apps[i].port) {
        return true;
      }
    }
    return false;
  }
};