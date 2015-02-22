var url    = require('url');
var Puid   = require('puid');

var GetHandler    = require('./get_handler'),
    PostHandler   = require('./post_handler'),
    DeleteHandler = require('./delete_handler'),
    PatchHandler  = require('./patch_handler');

var RequestHandler = (function () {

  var RequestHandler = function(args) {
    this.app      = args.app;
    this.request  = args.request;
    this.reqid    = undefined;
    this.puid     = new Puid('wao');
  };

  var p = RequestHandler.prototype;

  p.handle = function() {
    var that = this;
    this.reqid = this.puid.generate();
    this.app.logger.info('[' + this.reqid + '] Started ' + this.request.method + ' "' + this.request.url + '"');

    var handler = null,
        handlerArgs = { app: this.app, request: this.request, reqid: this.reqid },
        d = $.Deferred();

    switch(this.request.method) {
      case 'GET'    : handler = new GetHandler(handlerArgs);  break;
      case 'POST'   : handler = new PostHandler(handlerArgs); break;
      case 'DELETE' : handler = new DeleteHandler(handlerArgs); break;
      case 'PATCH'  : handler = new PatchHandler(handlerArgs); break;
    }

    (handler.handle())()
      .done(function(result) { result.reqid = that.reqid; d.resolve(result); })
      .fail(function(result) { result.reqid = that.reqid; d.reject(result); });

    return d.promise();
  };

  return RequestHandler;
})();

module.exports = RequestHandler;