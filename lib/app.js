
var http   = require('http');

var RequestHandler = require('./request_handler'),
    Logger         = require('./logger');

/**
 * アプリケーションクラス
 */
var App = (function() {

  var App = function(args) {
    this.name   = args.name;
    this.port   = args.port;
    this.server = http.createServer();
    this.logger = new Logger({ path: 'apps/' + args.name + '/logs/application.log' });
  };

  var p = App.prototype;

  p.start = function() {
    this.logger.info('Start WAO Server on port: ' + this.port);
    this.server.listen(this.port);

    var that = this;
    this.server.on('request', function(request, response) {
      var handler = new RequestHandler({
        app:      that,
        request:  request,
        response: response
      });

      handler.handle();
    });
  };

  return App;

})();

module.exports = App;