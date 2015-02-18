var http            = require('http');
var RequestHandler  = require('./request_handler'),
    ResponseBuilder = require('./response_builder'),
    ErrorHandler    = require('./error_handler'),
    File            = require('./file'),
    Db              = require('./db'),
    Logger          = require('./logger');

/**
 * アプリケーションクラス
 */
var App = (function() {

  var App = function(args) {
    this.wao    = args.wao;
    this.name   = args.name;
    this.port   = args.port;
    var defaultBaseDir = 'apps/' + args.name + '_' + args.port;
    var baseDir = args.baseDir || defaultBaseDir;
    this.file   = new File({ baseDir: baseDir});
    this.server = http.createServer();
    this.db     = new Db({dbName : args.name + '_' + args.port});

    this.startLogging(baseDir);
  };

  var p = App.prototype;

  p.start = function() {
    this.logger.info('Start WAO Server on port: ' + this.port);
    this.server.listen(this.port);

    this.db.open();

    var that = this;
    this.server.on('request', function(request, response) {
      var requestHandler  = new RequestHandler({ app: that, request: request });
      var responseBuilder = new ResponseBuilder({ app: that, response: response });
      var errorHandler    = new ErrorHandler({ app: that, response: response });

      $.when(requestHandler.handle())
        .done(function(result) { responseBuilder.build(result) })
        .fail(function(error) { errorHandler.handle(error) });
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
