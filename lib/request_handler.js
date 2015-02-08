var url    = require('url');

var GetHandler    = require('./get_handler'),
    PostHandler   = require('./post_handler'),
    DeleteHandler = require('./delete_handler'),
    PatchHandler  = require('./patch_handler');

var RequestHandler = (function () {

  var RequestHandler = function(args) {
    this.app      = args.app;
    this.request  = args.request;
  };

  var p = RequestHandler.prototype;

  p.handle = function() {

    this.app.logger.info('Started ' + this.request.method + ' "' + this.request.url + '"');

    var handler = null,
        handlerArgs = { app: this.app, request: this.request },
        d = $.Deferred();

    switch(this.request.method) {
      case 'GET'    : handler = new GetHandler(handlerArgs);  break;
      case 'POST'   : handler = new PostHandler(handlerArgs); break;
      case 'DELETE' : handler = new DeleteHandler(handlerArgs); break;
      case 'PATCH'  : handler = new PatchHandler(handlerArgs); break;
    }

    handler.handle()
      .done(function(result) { d.resolve(result); })
      .fail(function(result) { d.reject(result); });

    return d.promise();
  }

  return RequestHandler;
})();

module.exports = RequestHandler;