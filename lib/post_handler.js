var PostHandler = (function() {

  var PostHandler = function(args) {
    this.app      = args.app;
    this.request  = args.request;
    this.response = args.response;
  };

  var p = PostHandler.prototype;

  p.handle = function() {
    if (this.request.headers['content-type'].indexOf('multipart/form-data') >= 0) {
      this.app.logger.info('ファイルアップロード処理');
    } else {
      this.app.logger.info('POSTの処理');
    }
    this.response.end();
  };

  return PostHandler;
})();

module.exports = PostHandler;