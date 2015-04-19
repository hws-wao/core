'use strict';

var FileUpload = (function () {

  var FileUpload = function (app, reqParams) {
    this.app = app;
    this.reqParams = reqParams;
  };

  var p = FileUpload.prototype;

  p.execute = function (args) {
    var d = $.Deferred();

    if (_.isUndefined(args) || _.isEmpty(args) || _.isEmpty(Object.keys(args))) {
      d.resolve({});
    }

    var mvList = createMvList(args, Object.keys(args));
    uploadFiles(this.app, mvList, function () {　
      d.resolve({});　
    });

    return d.promise();
  };

  function createMvList(files, paths) {
    var mvList = [];
    for (var i = 0; i < paths.length; i++) {
      var path = paths[i];
      mvList.push({
        from: files[path][0],
        to: '..' + path
      });
    }
    return mvList;
  }

  function uploadFiles(app, fromToList, callback) {
    app.file.mvFiles({
      mvFileList: fromToList
    }).done(callback);
  }

  return FileUpload;
})();

module.exports = FileUpload;
