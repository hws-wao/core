'use strict';

var version = require('./version').readVersionFile().replace('\n', '').replace('\r', '');

exports.start = function(port) {
  global.serverPort = port;
  global.serverName = 'waoapp';
  global.serverBaseDir = process.cwd();
  require('../../lib').start();
  console.log('=> Booting WAO Server');
  console.log('=> WAO ' + version + ' server starting on port: ' + port);
  console.log('=> Ctrl-C to shutdown server');
};
