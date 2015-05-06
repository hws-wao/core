'use strict';

var AppError = require('../dto/app_error'),
  FileDao = require('../dao/file_dao');

var utils = require('../utils/utils');

var FileService = (function () {

  var FileService = function (app) {
    this.app = app;
    this.fileDao = new FileDao({
      baseDir: app.baseDir
    });
  };

  /**
   * Deferredでプロミスを返したあと、Deferredを引数に渡してコールバックを実行する。
   */
  function serviceFunc(callback) {
    return function (key, args) {
      var d = $.Deferred();
      var serviceResolver = {
        resolve: function (results) {
          d.resolve(key, results);
        }
      };

      try {
        callback.call(this, serviceResolver, args);
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

  function removeFiles(fileDao, files, callback) {
    files.forEach(function (path, i) {
      fileDao.unlink({
        path: path
      });

      // 最後のループ処理
      if (files.length === i + 1) {
        callback.call();
      }
    });
  }

  /**
   * ファイルパラメータを { [ファイルのパス] : [ファイルオブジェクト] } の形にする
   * @param {object} fileParam - ファイルリクエストパラメータ
   * @return {objcet} - ファイルパスがキーでファイルオブジェクトが値のオブジェクト
   */
  function restoreFilePath(fileParam, path) {
    var fileObjs = {};
    var _path = path || '';

    Object.keys(fileParam).forEach(function(key) {
      var __path = _.isEmpty(_path) ? key : _path + '.' + key;
      if (fileParam[key].path !== undefined && typeof fileParam[key].path === 'string') {
        fileObjs[__path] = fileParam[key];
      } else {
        $.extend(fileObjs, restoreFilePath(fileParam[key], __path));
      }
    });
    return fileObjs;
  }

  function createFileFromToPathList(reqArgs, paths) {
    var fromToList = [];
    var filePathObj = restoreFilePath(reqArgs);

    Object.keys(filePathObj).forEach(function (path) {
      fromToList.push({
        from: filePathObj[path].path,
        to: '..' + path
      });
    });

    return fromToList;
  }

  /**
   * アップロードを実行する
   * FIXME 複数ファイルのアップロードができません。
   */
  function doUploadFiles(fileDao, reqArgs, callback) {
    if (_.isUndefined(reqArgs) || _.isEmpty(reqArgs) || _.isEmpty(Object.keys(reqArgs))) {
      callback.call();
    }

    fileDao.mvFiles({ mvFileList: createFileFromToPathList(reqArgs) }).done(callback);
  }

  //
  //
  // インスタンスメソッド
  //
  //

  var p = FileService.prototype;

  p.get = serviceFunc(function (d) {
    d.resolve({});
  });

  p.post = serviceFunc(function (d, reqParams) {
    doUploadFiles(this.fileDao, reqParams, resolve(d));
  });

  p.patch = serviceFunc(function (d, reqParams) {
    doUploadFiles(this.fileDao, reqParams, resolve(d));
  });

  p.delete = serviceFunc(function (d, filePath) {
    var files = _.isArray(filePath) ? filePath : [filePath];
    removeFiles(this.fileDao, files, resolve(d));
  });

  p.test = serviceFunc(function (d, args) {
    // createFileFromToPathList();
    d.resolve({ t: 't' });
  });

  return FileService;
})();

module.exports = FileService;
