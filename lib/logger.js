var log4js = require('log4js'),
    config = require('config');



var Logger = (function() {

  var Logger = function(args) {
    log4js.configure({
      appenders: [
        {
          type:     'file',
          category: 'application',
          filename: args.path,
          pattern:  '-yyyy-MM-dd'
        }
      ]
    });

    this.logger = log4js.getLogger('application');
  };

  var p = Logger.prototype;

  p.info = function(args) {
    this.logger.info(args);
  }

  p.warn = function(args) {
    this.logger.warn(args);
  }

  p.error = function(args) {
    this.logger.error(args);
  }

  return Logger;
})();

module.exports = Logger;