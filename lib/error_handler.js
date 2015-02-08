var FileNotFoundError =  require('./errors/file_not_found_error');

var ErrorHandler = (function() {

  var ErrorHandler = function(args) {
    this.app      = args.app;
    this.response = args.response;
  };

  var p = ErrorHandler.prototype;

  p.handle = function(error) {
    var responseCode = 500;
    this.app.logger.error(error);

    if (error instanceof FileNotFoundError) { responseCode = 404 }

    this.response.statusCode = responseCode;
    this.response.end(error.message);
  };

  return ErrorHandler;
})();

module.exports = ErrorHandler;
