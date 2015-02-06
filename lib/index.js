require('date-utils');

var http   = require('http'),
    config = require('config');

var RequestHandler = require('./request_handler');

var App = (function() {

  var App = function() {
    var serverConfig = config.get('server');
    this.port   = serverConfig.port;
    this.server =  http.createServer();
  };

  var p = App.prototype;

  p.start = function() {
    console.log('Start WAO Server on port: ' + this.port);
    this.server.listen(this.port);
    this.server.on('request', RequestHandler);
  };

  return App;

})();

module.exports = {
  start: function start() {
    var app = new App();
    app.start();
  }
};

