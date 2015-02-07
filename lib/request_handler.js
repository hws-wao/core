var logger = require('./logger'),
    url    = require('url');

var File   = require('./file');

var RequestHandler = (function () {

  var RequestHandler = function(args) {
    this.app      = args.app;
    this.request  = args.request;
    this.response = args.response;
    this.method   = args.request.method;
    this.url      = args.request.url;
    this.version  = args.request.httpVersion;
    this.file     = new File({ baseDir: 'apps/' + args.app.name });
  };

  var p = RequestHandler.prototype;

  p.handle = function() {
    this.app.logger.info('Started ' + this.method + ' "' + this.url + '"');

    try {
      switch(this.method) {
        case 'GET':  this.handleGet();  break;
        case 'POST': this.handlePost(); break;
      }
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
    this.app.logger.info('GETの処理');
    this.response.setHeader('Content-Type', 'text/html');
    this.response.statusCode = 200;
    var path = 'templates' + this.url;
    var parseUrl = url.parse(this.url);
    var dirPathRegExp = new RegExp('/$');

    if (dirPathRegExp.test(parseUrl.path)) {
      path += 'index.html';
    }

    if (!this.file.exists({ path: path })) {
      this.response.statusCode = 404;
      this.response.end('404 Not Found.');
    } else {
      try {
        this.response.statusCode = 200;
        this.response.end(this.file.read({ path: path }));
      } catch(e) {
        this.app.logger.error(e);
        this.response.statusCode = 500;
        this.response.end('500 Internal Server Error.');
      }
    }

    this.app.logger.info('Completed. http response for ' + this.response.statusCode);
  };

  return RequestHandler;
})();


module.exports = RequestHandler;
