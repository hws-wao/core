var ResponseBuilder = (function() {

  var ResponseBuilder = function(args) {
    this.app      = args.app;
    this.response = args.response;
  };

  var mime = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css' : 'text/css',
    '.js'  : 'application/javascript',
    '.png' : 'image/png',
    '.jpg' : 'image/jpeg',
    '.gif' : 'image/gif',
    '.txt' : 'text/plain'
  };

  var p = ResponseBuilder.prototype;

  p.build = function(result) {
    console.log(result);
    this.response.statusCode = 200;
    this.response.statusMessage = 'OK';
    this.response.setHeader('Content-Type', mime[result._FILE.ext]);
    this.response.end(result._FILE.template);
  };

  return ResponseBuilder;
})();

module.exports = ResponseBuilder;
