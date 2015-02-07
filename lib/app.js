
var http   = require('http'),
    $      = require('jquery-deferred');

var RequestHandler = require('./request_handler'),
    File           = require('./file'),
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
    this.file   = new File({ baseDir: 'apps/' + args.name });
  };

  var p = App.prototype;

  p.start = function() {
    this.logger.info('Start WAO Server on port: ' + this.port);
    this.server.listen(this.port);

    var that = this;
    this.server.on('request', function(request, response) {
      var requestHandler  = new RequestHandler({ app: that, request: request });

      $.when(requestHandler.handle())
        .done(function(result) {
          response.setHeader('Content-Type', 'text/html')
          response.end(result._FILE.template);
        })
        .fail(function(result) {
          that.logger.error(result._ERROR.exception);
          response.end('ERROR: ' + result._ERROR.code);
        });
    });
  };

  return App;
})();

module.exports = App;