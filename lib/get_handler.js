var url = require('url'),
    $   = require('jquery-deferred');

var FileNotFoundError = require('./errors/file_not_found_error');

var GetHandler = (function() {

  var GetHandler = function(args) {
    this.app      = args.app;
    this.request  = args.request;
    this.response = args.response;
  };

  var p = GetHandler.prototype;

  p.handle = function() {
    var loadPath = this.getLoadFilePath(),
        result   = { _FILE: {}, _DB: {} },
        d        = $.Deferred();

    try {
      if (!this.app.file.exists({ path: loadPath })) {
        d.reject(new FileNotFoundError());
      } else {
        result._FILE.template = this.app.file.read({ path: loadPath })
        d.resolve(result);
      }
    } catch(e) {
      d.reject(e);
    }

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
