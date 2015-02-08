var AppError = (function() {

  var AppError = function(status, exception, options) {
    this.status    = status;
    this.exception = exception;
    this.options      = options;
  };

  return AppError;
})();

module.exports = AppError;
