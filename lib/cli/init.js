'use strict';

var fs = require('fs-extra'),
path = require('path');

exports.init = function() {
  fs.copySync(path.resolve(__dirname, './template/'), '.');
  console.log("Initialized new WAO Application in " + process.cwd());
}
