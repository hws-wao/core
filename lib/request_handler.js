var logger = require('./logger'),
    url    = require('url');

var GetHandler  = require('./get_handler'),
    PostHandler = require('./post_handler');

var RequestHandler = (function () {

  var RequestHandler = function(args) {
    this.app      = args.app;
    this.request  = args.request;
    this.response = args.response;
  };

  var p = RequestHandler.prototype;

  p.handle = function() {
    this.app.logger.info('Started ' + this.request.method + ' "' + this.request.url + '"');

    try {
      var handler = null;
      var handlerArgs = { app: this.app, request: this.request, response: this.response };

      switch(this.request.method) {
        case 'GET' : handler = new GetHandler(handlerArgs);  break;
        case 'POST': handler = new PostHandler(handlerArgs); break;
      }

      handler.handle();

    } catch(e) {
      this.app.logger.error(e);
    }
  }

  return RequestHandler;
})();

module.exports = RequestHandler;
