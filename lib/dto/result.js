'use strict'

var Result = (function() {

  var Result = function(args) {
    this._FILE = {};
    this._DB   = {};
    this.template = undefined;
    this.reqid = undefined;

    if (args) {
      this._FILE = args._FILE || {};
      this._DB   = args._DB   || {};
      this.reqid = args.reqid || '00000000000000';
    }
  };

  return Result;
})();

module.exports = Result;