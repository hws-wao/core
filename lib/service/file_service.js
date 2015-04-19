'use strict';

var FileUpload = require('../model/executer/file_upload'),
  AppError = require('../dto/app_error');

var FileService = (function () {

  var FileService = function (args) {
    this.app = args.app;
    this.request = args.request;
    this.reqParams = args.requestParams;
  };

  /**
   * Deferredを返してコールバックを実行する関す
   */
  function serviceFunc(callback) {
    return function (args) {
      var d = $.Deferred();
      try {
        callback.call(this, d, args);
      } catch (e) {
        d.reject(new AppError(500, e));
      }
      return d;
    };
  }

  /**
   * 引数で受け取った情報をresolveの引数に入れて、
   *   Deferredのresolveを実行する。
   */
  function resolve(d) {
    return function (result) {
      d.resolve(result);
    };
  }

  var p = FileService.prototype;

  p.get = serviceFunc(function (d, args) {
    d.resolve();
  });

  p.post = serviceFunc(function (d, args) {
    (new FileUpload(this.app)).execute(args).done(resolve(d));
  });

  p.patch = serviceFunc(function (d, args) {
    (new FileUpload(this.app)).execute(args).done(resolve(d));
    d.resolve();
  });

  p.delete = serviceFunc(function (d, filePath) {
    var files = _.isArray(filePath) ? filePath : [filePath];
    removeFiles(this.app, files, function () {
      d.resolve({});
    });
  });

  function removeFiles(app, files, callback) {
    files.forEach(function (path, i) {
      app.file.unlink({
        path: path
      });
      if (files.length === i + 1) {
        callback.call();
      }
    });
  }

  return FileService;
})();

module.exports = FileService;
