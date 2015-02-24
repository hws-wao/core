var http            = require('http'),
    url             = require('url'),
    path            = require('path');

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
    var defaultBaseDir = 'apps/' + this.getAppId();
    var baseDir = args.baseDir || defaultBaseDir;
    this.file   = new File({ baseDir: baseDir});
    this.server = http.createServer();
    this.db     = new Db({dbName : this.getAppId() });
    this._HTML  = {};

    this.startLogging(baseDir);
  };

  var p = App.prototype;

  p.start = function() {
    this.logger.info('Start WAO Server on port: ' + this.port);
    this.server.listen(this.port);
    this.db.open();

    var that = this;
    this.server.on('request', function(request, response) {
      if (that.isDirectResponseRequest(request)) {
        that.directResponse(request, response);
      } else {
        that.handlingRequest(request, response);
      }
    });
  };

  p.startLogging = function(baseDir) {
    if (!this.file.exists({ path: 'logs' })) {
      this.file.mkdirp({ path: 'logs' });
    }
    this.logger = new Logger({ path: baseDir + '/logs/application.log' });
  };

  p.getAppId = function() {
    return this.name + '_' + this.port;
  };

  p.isDirectResponseRequest = function(request) {
    var parsedUrl = url.parse(request.url);
    var ext = path.extname(parsedUrl.pathname);
    return !(ext === '.html' || ext === '');
  };

  p.directResponse = function(request, response) {
    var responseBuilder = new ResponseBuilder({ app: this, request: request, response: response });
    responseBuilder.directResponse();
  };

  p.handlingRequest = function(request, response) {
    var responseBuilder = new ResponseBuilder({ app: this, request: request, response: response });
    var requestHandler  = new RequestHandler({ app: this, request: request, response: response });
    var errorHandler    = new ErrorHandler({ app: this, response: response });

    $.when(requestHandler.handle())
      .done(function(result) { responseBuilder.build(result); })
      .fail(function(error) { errorHandler.handle(error); });
  };

  return App;
})();

module.exports = App;
