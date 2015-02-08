var config = require('config'),
    jsdom  = require('jsdom');

var serverConfig = config.get('server');
var File         = require('./file');
var App          = require('./app');

var file   = new File({ baseDir: './' }),
    jquery = 'https://code.jquery.com/jquery-2.1.3.js',
    window = jsdom.jsdom('').parentWindow;

module.exports = {
  apps: [],
  start: function() {
    var that = this;
    jsdom.jQueryify(window, jquery, function(window, $$) {
      global.$ = $$;

      var app = new App({ wao: that, name: serverConfig.name, port: serverConfig.port });
      app.start();
      that.apps.push(app);
    });
  },
  createAndStartApp : function(args) {
    if (!this.isAlreadylistenPort(args.port)) {
      var app = new App({ wao: this, name: args.name, port: args.port });
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

