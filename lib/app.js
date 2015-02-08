
var http   = require('http'),
    $      = require('jquery-deferred');

var RequestHandler = require('./request_handler'),
    ErrorHandler   = require('./error_handler'),
    File           = require('./file'),
    Logger         = require('./logger');

/**
 * アプリケーションクラス
 */
var App = (function() {

  var App = function(args) {
    this.name   = args.name;
    this.port   = args.port;
    var baseDir = 'apps/' + args.name + '_' + args.port;
    this.file   = new File({ baseDir: baseDir});
    this.server = http.createServer();

    this.startLogging(baseDir);
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
        .fail(function(error) {
          (new ErrorHandler({ app: that, response: response })).handle(error);
        });
    });
  };

  p.startLogging = function(baseDir) {
    if (!this.file.exists({ path: 'logs' })) {
      this.file.mkdirp({ path: 'logs' });
    }
    this.logger = new Logger({ path: baseDir + '/logs/application.log' });
  }

  return App;
})();

module.exports = App;
