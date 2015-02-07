var multiparty = require('multiparty'),
    path       = require('path'),
    $          = require('jquery-deferred');

// var FileUploader = require('./file_uploader');

var PostHandler = (function() {

  var PostHandler = function(args) {
    this.app      = args.app;
    this.request  = args.request;
  };

  var p = PostHandler.prototype;

  p.handle = function() {
    var d = $.Deferred(),
        result = { _FILE: {}, _DB: {}, _ERROR: {} };

    if (this.request.headers['content-type'].indexOf('multipart/form-data') >= 0) {
      // (new FileUploader({ app: this.app, request: this.request })).upload();
      var form = new multiparty.Form();
      var that = this;
      form.parse(this.request, function(err, fields, data) {
        var filePath = Object.keys(data)[0];

        var mvFileList = [];
        for(var i = 0; i < data[filePath].length; i++) {
          mvFileList.push({ from: data[filePath][i]['path'], to: filePath })
        }

        that.app.file
          .mvFiles({ mvFileList: mvFileList })
          .done(function() { d.resolve(result); })
          .fail(function() {
            result._ERROR.code = 500;
            d.reject(result);
          });
      });
    } else {
      this.app.logger.info('POSTの処理');
    }

    return d.promise();
  };

  return PostHandler;
})();

module.exports = PostHandler;
