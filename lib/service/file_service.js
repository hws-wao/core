'use strict';

var AppError = require('../dto/app_error'),
  FileDao = require('../dao/file_dao'),
  DbDao = require('../dao/db_dao'),
  HiddenPath = require('../utils/hidden_path'),
  authUtils = require('../utils/auth_utils');

var FileService = (function() {

  var FileService = function(app) {
    this.app = app;
    this.fileDao = new FileDao({
      baseDir: app.baseDir
    });
    this.dbDao = new DbDao(app);
  };

  /**
   * Deferredでプロミスを返したあと、Deferredを引数に渡してコールバックを実行する。
   */
  function serviceFunc(callback) {
    return function(key, args, meta) {
      var d = $.Deferred();
      var serviceResolver = {
        resolve: function(results) {
          var res = {};
          res[key] = results;
          d.resolve(res);
        },
        reject: function(e) {
          d.reject(new AppError(500, e));
        }
      };

      try {
        callback.call(this, serviceResolver, args, meta);
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
    return function(result) {
      d.resolve(result);
    };
  }

  /**
   * 引数で受け取った情報をresolveの引数に入れて、
   *   Deferredのrejectを実行する。
   */
  function reject(d) {
    return function(e) {
      d.reject(e);
    };
  }

  function removeFiles(fileDao, files, callback) {
    files.forEach(function(path, i) {
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

    Object.keys(filePathObj).forEach(function(path) {
      fromToList.push({
        from: filePathObj[path].path,
        to: '..' + path,
        owner: filePathObj[path].owner,
        group: filePathObj[path].group,
        permission: filePathObj[path].permission
      });
    });

    return fromToList;
  }

  /**
   * アップロードを実行する
   * FIXME 複数ファイルのアップロードができません。
   */
  function doUploadFiles(fileDao, dbDao, reqArgs, resolve, reject) {
    if (_.isUndefined(reqArgs) || _.isEmpty(reqArgs) || _.isEmpty(Object.keys(reqArgs))) {
      resolve.call();
    }
    var list = createFileFromToPathList(reqArgs);

    fileDao.mvFiles({
        mvFileList: list
      })
      .then(function() {
        var d = $.Deferred();
        addFileAuthManeger(dbDao, list, d);
        return d.promise();
      })
      .done(resolve)
      .fail(reject)
  }

  /**
   * リクエストパラメータにファイル情報を付加して返す
   *
   * _FILE./aaa/bbb/ccc.png._path のように_pathを最後に指定した場合、公開用のパスを付加する
   * _FILE./aaa/bbb/ccc.txt._body のように_bodyを最後に指定した場合、読みこんだファイルの内容を付加する
   *
   * @param {object} fileDao - Fileアクセス用オブジェクト
   * @param {object} dbDao - DBアクセス用オブジェクト
   * @param {object} fileParams - リクエストパラメータ
   * @param {object} meta - meta情報
   * @param {string} path - 再帰的にオブジェクトを探索しながら、ファイルのパスを生成する為に使用する引数
   * @return {object} 引数のfileParamsにファイル情報を付加したオブジェクト
   */
  function loadFiles(fileDao, dbDao, fileParams, meta, path, resolve, reject) {
    var files = {};
    Object.keys(fileParams).forEach(function(key) {
      var _path = _.isEmpty(path) ? key : path + '.' + key;
      var val = fileParams[key];

      if (typeof val === 'object') {
        val = loadFiles(fileDao, dbDao, fileParams[key], meta, _path, resolve, reject);
      } else {
        checkAuth(dbDao, path, meta['_AUTH'])
          .done(function() {
            if (key === '_body') {
              // ファイルの内容を取得
              fileParams[key] = fileDao.read({
                path: path
              });
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
            $.extend(files, fileParams);
            resolve(files);
          })
          .fail(reject)
      }
    });
  }

  function checkAuth(dbDao, path, auth) {
    var d = $.Deferred();
    var daoArgs = {};
    daoArgs['colName'] = 'sys_user_files';
    daoArgs['query'] = {
      path: '..' + path
    };

    (dbDao.find(daoArgs))()
    .done(function(collectionName, docs) {
        if (!authUtils.isReadable(docs, auth)) {
          return d.reject(new AppError(403, null, {
            message: 'read権限がありません'
          }));
        }
        d.resolve();
      })
      .fail(function(err) {
        d.reject(new AppError(500, null, {
          message: 'ファイルアクセス権限チェックに失敗しました。' + err
        }));
      });

    return d.promise();
  }

  /**
   * ファイル権限管理ドキュメントにファイル情報を保存します。
   */
  function addFileAuthManeger(dbDao, fileList, d) {
    var execCount = 0;
    for (var i = 0; i < fileList.length; i++) {
      var mvFile = fileList[i];
      if (mvFile.owner || mvFile.group || mvFile.permission) {
        var daoArgs = {};
        daoArgs['colName'] = 'sys_user_files';
        daoArgs['doc'] = {};
        daoArgs['doc']['path'] = mvFile.to;
        if (mvFile.owner) {
          daoArgs['doc']['_owner'] = mvFile.owner;
        }
        if (mvFile.group) {
          daoArgs['doc']['_group'] = mvFile.group;
        }
        if (mvFile.permission) {
          daoArgs['doc']['_permission'] = mvFile.permission;
        }
        daoArgs['selector'] = {
          path: mvFile.to
        };
        daoArgs['upsert'] = true;
        (dbDao.update(daoArgs))()
        .done(function() {
            execCount++;
            if (execCount === fileList.length) {
              d.resolve();
            }
          })
          .fail(function(e) {
            d.reject(e);
          });
      } else {
        execCount++;
      }
      if (execCount === fileList.length) {
        d.resolve();
      }
    }
  }

  //
  //
  // インスタンスメソッド
  //
  //

  var p = FileService.prototype;

  p.get = serviceFunc(function(d, reqParams, meta) {
    loadFiles(this.fileDao, this.dbDao, reqParams, meta, null, resolve(d), reject(d));
  });

  p.post = serviceFunc(function(d, reqParams, meta) {
    doUploadFiles(this.fileDao, this.dbDao, reqParams, resolve(d), reject(d));
  });

  p.patch = serviceFunc(function(d, reqParams, meta) {
    doUploadFiles(this.fileDao, this.dbDao, 　reqParams, resolve(d), reject(d));
  });

  p.delete = serviceFunc(function(d, filePath, meta) {
    var files = _.isArray(filePath) ? filePath : [filePath];
    removeFiles(this.fileDao, files, resolve(d));
  });

  p.test = serviceFunc(function(d, args, meta) {
    // createFileFromToPathList();
    d.resolve({
      t: 't'
    });
  });

  return FileService;
})();

module.exports = FileService;
