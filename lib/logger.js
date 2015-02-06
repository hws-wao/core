var log4js = require('log4js'),
    config = require('config');

var logConfig = config.get('logger');
log4js.configure(logConfig);

var logger = log4js.getLogger('application');

module.exports = logger;