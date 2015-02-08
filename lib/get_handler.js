var url = require('url'),
    $   = require('jquery-deferred');

var GetHandler = (function() {

  var GetHandler = function(args) {
    this.app      = args.app;
    this.request  = args.request;
    this.response = args.response;
  };

  var p = GetHandler.prototype;

  p.handle = function() {
    var loadPath = this.getLoadFilePath(),
        result   = { _FILE: {}, _DB: {}, _ERROR: {} },
        d        = $.Deferred();

    try {
      if (!this.app.file.exists({ path: loadPath })) {
        result._ERROR.code = 404;
      } else {
        result._FILE.template = this.app.file.read({ path: loadPath })
      }
    } catch(e) {
      result._ERROR.code = 500;
      result._ERROR.exception = e;
    }

    result._ERROR.code === undefined ? d.resolve(result) : d.reject(result);

    return d.promise();
  };

  p.getLoadFilePath = function() {
    var path          = 'templates' + this.request.url,
        parseUrl      = url.parse(this.request.url),
        dirPathRegExp = new RegExp('/$');

    if (dirPathRegExp.test(parseUrl.path)) {
      path += 'index.html';
    }

    return path;
  };

  return GetHandler;
})();

module.exports = GetHandler;
