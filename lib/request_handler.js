var logger = require('./logger'),
    url    = require('url');

var GetHandler = require('./get_handler');

var RequestHandler = (function () {

  var RequestHandler = function(args) {
    this.app      = args.app;
    this.request  = args.request;
    this.response = args.response;
    this.method   = args.request.method;
    this.url      = args.request.url;
    this.version  = args.request.httpVersion;
  };

  var p = RequestHandler.prototype;

  p.handle = function() {
    this.app.logger.info('Started ' + this.method + ' "' + this.url + '"');

    try {
      var handler = null;
      var handlerArgs = { app: this.app, request: this.request, response: this.response };

      switch(this.method) {
        case 'GET' : handler = new GetHandler(handlerArgs);  break;
        case 'POST': this.handlePost(); break;
      }

      handler.handle();
    } catch(e) {
      this.app.logger.error(e);
    }
  }

  p.handlePost = function() {
    if (this.request.headers['content-type'].indexOf('multipart/form-data') >= 0) {
      this.app.logger.info('ファイルアップロード処理');
    } else {
      this.app.logger.info('POSTの処理');
    }
    this.response.end();
  };

  p.handleGet = function() {
  };

  return RequestHandler;
})();


module.exports = RequestHandler;
