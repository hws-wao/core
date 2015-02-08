'use strict'

var Result = (function() {

  var Result = function(args) {
    this._FILE = {};
    this._DB   = {};

    if (args) {
      this._FILE = args._FILE || {};
      this._DB   = args._DB   || {};
    }
  };

  return Result;
})();

module.exports = Result;