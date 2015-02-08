'use strict'

var ErrorHandler = (function() {

  var ErrorHandler = function(args) {
    this.app      = args.app;
    this.response = args.response;
  };

  var p = ErrorHandler.prototype;

  p.handle = function(error) {
    this.response.statusCode = error.status;
    this.response.end(error.message);

    if (error.excpetion !== null) {
      this.app.logger.error(error.excpetion);
    }
  };

  return ErrorHandler;
})();

module.exports = ErrorHandler;
