require('date-utils');

var http   = require('http'),
    config = require('config'),
    logger = require('./logger');

var RequestHandler = require('./request_handler');

var App = (function() {

  var App = function() {
    var serverConfig = config.get('server');
    this.port   = serverConfig.port;
    this.server = http.createServer();
  };

  var p = App.prototype;

  p.start = function() {
    logger.info('Start WAO Server on port: ' + this.port);
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

