var Result       = require('../../dto/result');
var GetHandler   = require('./get');

var DeleteHandler = (function() {

  var DeleteHandler = function(args) {
    this.app       = args.app;
    this.request   = args.request;
    this.response  = args.response;
    this.reqParams = args.requestParams;
  };

  var p = DeleteHandler.prototype;

  p.handle = function() {
    var that = this;
    return function() {
      var d = $.Deferred(), result = new Result({ _FILE: {}, _DB: {} });

      // TODO:302リダイレクトを実装したら不要となるので、削除
      var getHandler = new GetHandler({ app: that.app, request: that.request });

      that.app.file.unlink({ path: that.reqParams._FILE });

      // TODO: 302リダイレクトを実装するまでの暫定実装
      (getHandler.handle(result))()
        .done(function(result) { d.resolve(result); });

      return d.promise();
    };
  };

  return DeleteHandler;
})();

module.exports = DeleteHandler;
