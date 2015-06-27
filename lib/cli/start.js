'use strict';

exports.start = function(port) {
  global.serverPort = port;
  global.serverName = 'waoapp';
  global.serverBaseDir = process.cwd();
  require('../../lib').start();
};
