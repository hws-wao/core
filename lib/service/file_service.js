'use strict';

var AppError = require('../dto/app_error'),
  FileDao = require('../dao/file_dao'),
  HiddenPath = require('../utils/hidden_path');

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
          var res = {};
          res[key] = results;
          d.resolve(res);
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

  /**
   * リクエストパラメータにファイル情報を付加して返す
   *
   * _FILE./aaa/bbb/ccc.png._path のように_pathを最後に指定した場合、公開用のパスを付加する
   * _FILE./aaa/bbb/ccc.txt._body のように_bodyを最後に指定した場合、読みこんだファイルの内容を付加する
   *
   * @param {object} fileDao - Fileアクセス用オブジェクト
   * @param {object} fileParams - リクエストパラメータ
   * @param {string} path - 再帰的にオブジェクトを探索しながら、ファイルのパスを生成する為に使用する引数
   * @return {object} 引数のfileParamsにファイル情報を付加したオブジェクト
   */
  function loadFiles(fileDao, fileParams, path) {
    var files = {};

    Object.keys(fileParams).forEach(function(key) {
      var _path = _.isEmpty(path) ? key : path + '.' + key;
      var val = fileParams[key];

      if (typeof val === 'object') {
        val = loadFiles(fileDao, fileParams[key], _path);
      } else {
        if (key === '_body') {
          // ファイルの内容を取得
          fileParams[key] = fileDao.read({ path: path });
        } else if (key === '_path') {
          // 公開URLのパスを取得
          if (path.match(/^\/templates\//)) {
            fileParams[key] = path.replace(/^\/templates/, '');
          } else {
            var hp = new HiddenPath();
            fileParams[key] = hp.encrypt(path);
          }
        } else {
          // ディレクトリ構造取得
          fileParams[key] = fileDao.readDirRecursive(_path);
        }
      }

      $.extend(files, fileParams);
    });

    return files;
  }

  //
  //
  // インスタンスメソッド
  //
  //

  var p = FileService.prototype;

  p.get = serviceFunc(function (d, reqParams) {
    d.resolve(loadFiles(this.fileDao, reqParams));
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
