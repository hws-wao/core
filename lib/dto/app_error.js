var AppError = (function() {

  var AppError = function(status, exception, options) {
    var _options = options || {};
    this.status    = status;
    this.exception = exception;
    this.message   = _options.message || '';
    this.options   = _options;
  };

  return AppError;
})();

module.exports = AppError;
