'use strict'

var multiparty = require('multiparty');

var FileUpload = (function() {

  var FileUpload = function(app, reqParams) {
    this.app = app;
    this.reqParams = reqParams;
  };

  var p = FileUpload.prototype;

  p.execute = function() {
    var d = $.Deferred();

    if (this.reqParams && Object.keys(this.reqParams._FILE).length > 0) {
      var paths  = Object.keys(this.reqParams._FILE);
      var mvList = [];
      for (var i = 0; i < paths.length; i++) {
        var path = paths[i];
        mvList.push({ from: this.reqParams._FILE[path][0], to: path });
      }
      this.upload(mvList, function() {
        d.resolve();
      });
    }

    return d.promise();
  };

  p.upload = function(fromToList, callback) {
    this.app.file.mvFiles({ mvFileList: fromToList }).done(callback);
  };

  function parseForm(req, callback) {
    var d = $.Deferred();
    var form = new multiparty.Form();
    form.parse(req, function(err, fields, files) {
      callback(d, err, fields, files);
    });
    return d;
  }

  function extractPath(fileParam) {
    return fileParam.split(/^_FILE./)[1];
  }

  return FileUpload;
})();

module.exports = FileUpload;
