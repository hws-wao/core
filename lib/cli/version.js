
var fs = require('fs');

exports.readVersion = function() {
  var text = fs.readFileSync(__dirname + '/../../VERSION', 'utf-8');
  console.log(text);
  process.exit(0);
};
