'use strict'

var ErrorHandler = (function() {

  var ErrorHandler = function(args) {
    this.app      = args.app;
    this.response = args.response;
  };

  var p = ErrorHandler.prototype;

  p.handle = function(error) {
    this.response.statusCode = error.status || 500;
    this.response.end(error.message);

    if (error.message !== null && error.message !== undefined) {
      this.app.logger.error(error.message);
    }
    if (error.excpetion !== null && error.excpetion !== undefined) {
      this.app.logger.error(error.excpetion);
    }
  };

  return ErrorHandler;
})();

module.exports = ErrorHandler;
