require('date-utils');

var config       = require('config');
var serverConfig = config.get('server');
var App          = require('./app');

module.exports = {
  start: function() {
    var app = new App({ name: serverConfig.name, port: serverConfig.port });
    app.start();
  }
};
