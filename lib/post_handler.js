var multiparty = require('multiparty'),
    path       = require('path');

// var FileUploader = require('./file_uploader');

var PostHandler = (function() {

  var PostHandler = function(args) {
    this.app      = args.app;
    this.request  = args.request;
    this.response = args.response;
  };

  var p = PostHandler.prototype;

  p.handle = function() {
    if (this.request.headers['content-type'].indexOf('multipart/form-data') >= 0) {
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
          .done(function(){ that.response.end(); });
      });
    } else {
      this.app.logger.info('POSTの処理');
      this.response.end();
    }
  };

  return PostHandler;
})();

module.exports = PostHandler;
