var DeleteHandler = (function() {

  var DeleteHandler = function(args) {
    this.app      = args.app;
    this.request  = args.request;
    this.response = args.response;
  };

  var p = DeleteHandler.prototype;

  p.handle = function() {
    this.app.logger.info('DELETEの処理');
    this.response.end();
  };

  return DeleteHandler;
})();

module.exports = DeleteHandler;