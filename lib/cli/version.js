
var fs = require('fs');

exports.readVersionFile = function() {
  return fs.readFileSync(__dirname + '/../../VERSION', 'utf-8');
};

exports.readVersion = function() {
  var text = exports.readVersionFile();
  console.log(text);
  process.exit(0);
};
