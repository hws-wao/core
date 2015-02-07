var url = require('url');

var GetHandler = (function() {

  var GetHandler = function(args) {
    this.app      = args.app;
    this.request  = args.request;
    this.response = args.response;
  };

  var p = GetHandler.prototype;

  p.handle = function() {
    this.response.setHeader('Content-Type', 'text/html');
    this.response.statusCode = 200;

    var path = 'templates' + this.request.url;
    var parseUrl = url.parse(this.request.url);
    var dirPathRegExp = new RegExp('/$');

    if (dirPathRegExp.test(parseUrl.path)) {
      path += 'index.html';
    }

    if (!this.app.file.exists({ path: path })) {
      this.response.statusCode = 404;
      this.response.end('404 Not Found.');
    } else {
      try {
        this.response.statusCode = 200;
        this.response.end(this.app.file.read({ path: path }));
      } catch(e) {
        this.app.logger.error(e);
        this.response.statusCode = 500;
        this.response.end('500 Internal Server Error.');
      }
    }

    this.app.logger.info('Completed. http response for ' + this.response.statusCode);
  };

  return GetHandler;
})();

module.exports = GetHandler;