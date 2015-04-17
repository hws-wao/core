var PatchHandler = (function() {

  var PatchHandler = function(args) {
    this.app      = args.app;
    this.request  = args.request;
    this.response = args.response;
  };

  var p = PatchHandler.prototype;

  p.handle = function() {
    this.app.logger.info('PATCHの処理');
    this.response.end();
  };

  return PatchHandler;
})();

module.exports = PatchHandler;