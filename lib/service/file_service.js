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

  function removeFiles(fileDao, dbDao, files, meta, resolve, reject) {
    files.forEach(function(path, i) {
      checkAuth(dbDao, '..' + path, meta['_LOGIN_INFO'], 'w')
        .done(function() {
          fileDao.unlink({
            path: path
          });
          // 最後のループ処理
          if (files.length === i + 1) {
            resolve(files);
          }
        })
        .fail(reject)
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

  function createFileFromToPathList(reqArgs, meta) {
    var fromToList = [];
    var filePathObj = restoreFilePath(reqArgs);

    Object.keys(filePathObj).forEach(function(path) {
      fromToList.push({
        from: filePathObj[path].path,
        to: '..' + path,
        owner: meta._AUTH.owner,
        group: meta._AUTH.group,
        permission: meta._AUTH.permission
      });
    });

    return fromToList;
  }

  /**
   * アップロードを実行する
   * FIXME 複数ファイルのアップロードができません。
   */
  function doUploadFiles(fileDao, dbDao, reqArgs, meta, resolve, reject) {
    if (_.isUndefined(reqArgs) || _.isEmpty(reqArgs) || _.isEmpty(Object.keys(reqArgs))) {
      resolve.call();
    }
    var mvFileList = createFileFromToPathList(reqArgs, meta);

    var promises = [];
    for (var i = 0; i < mvFileList.length; i++) {
      promises.push(uploadFileAsync(fileDao, dbDao, meta, mvFileList[i]));
    }
    $.when.apply(null, promises).done(resolve).fail(reject);
  }

  /**
   * アクセス権限チェック後にアップロードを実行します。
   *
   * @param {object} fileDao Fileアクセス用オブジェクト
   * @param {object} dbDao DBアクセス用オブジェクト
   * @param {object} meta meta情報
   * @param {object} mvFile アップロード対象のファイル
   */
  function uploadFileAsync(fileDao, dbDao, meta, mvFile) {
    var d = $.Deferred();
    checkAuth(dbDao, mvFile.to, meta['_LOGIN_INFO'], 'w')
      .then(function() {
        return addFileAuthManeger(dbDao, mvFile);
      })
      .then(function() {
        return fileDao.mvFiles({
          mvFile: mvFile
        })
      })
      .done(function() {
        d.resolve();
      })
      .fail(function(e) {
        d.reject(e);
      })
    return d.promise();
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
   * @param {function} resolve - コールバック関数(resolve)
   * @param {function} reject - コールバック関数(reject)
   * @return {object} 引数のfileParamsにファイル情報を付加したオブジェクト
   */
  function loadFiles(fileDao, dbDao, fileParams, meta, resolve, reject) {
    var promises = [];
    parseLoadFileParams(fileDao, dbDao, fileParams, null, meta, promises);
    $.when.apply(null, promises).done(function(files) {
      resolve(files);
    }).fail(reject);
  }

  /**
   * リクエストパラメータを再帰的に解析し、ファイル情報を取得する非同期処理を呼び出します。
   * 
   * @param {object} fileDao - Fileアクセス用オブジェクト
   * @param {object} dbDao - DBアクセス用オブジェクト
   * @param {object} fileParams - リクエストパラメータ
   * @param {string} path - 再帰的にオブジェクトを探索しながら、ファイルのパスを生成する為に使用する引数
   * @param {object} meta - meta情報
   * @param {array} promises - promiseを格納する配列
   */
  function parseLoadFileParams(fileDao, dbDao, fileParams, path, meta, promises) {
    Object.keys(fileParams).forEach(function(key) {
      var _path = _.isEmpty(path) ? key : path + '.' + key;
      var val = fileParams[key];

      if (typeof val === 'object') {
        parseLoadFileParams(fileDao, dbDao, fileParams[key], _path, meta, promises);
      } else {
        promises.push(loadFileAsync(fileDao, dbDao, fileParams, key, path, meta));
      }
    });
  }

  /**
   * 権限チェック後に非公開ファイルパスの公開用のパス、ファイル内容、ディレクトリ情報を取得します。
   *
   * @param {object} fileDao - Fileアクセス用オブジェクト
   * @param {object} dbDao - DBアクセス用オブジェクト
   * @param {object} fileParams - リクエストパラメータ
   * @param {object} key - 取得対象(_body:ファイル内容、_path:公開用パス、左記以外：ディレクトリ情報)
   * @param {string} path - アクセス対象のパス
   * @param {object} meta - meta情報
   */
  function loadFileAsync(fileDao, dbDao, fileParams, key, path, meta) {
    var d = $.Deferred();
    checkAuth(dbDao, '..' + path, meta['_LOGIN_INFO'], 'r')
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
        d.resolve(fileParams);
      })
      .fail(function(e) {
        d.reject(e);
      })
    return d.promise();
  }

  /**
   * ファイルまたはディレクトリのread/write権限があるかチェックします。
   *
   * @param {object} dbDao - DBアクセス用オブジェクト
   * @param {string} path - アクセス対象のパス
   * @param {object} auth 権限オブジェクト
   * @param {string} rw r:読み込み/w:書き込み
   * @return read/write権限がある場合、true
   */
  function checkAuth(dbDao, path, auth, rw) {
    var d = $.Deferred();
    var daoArgs = {};
    daoArgs['colName'] = '_FILE';
    daoArgs['query'] = {
      "permission.path": path
    };

    (dbDao.find(daoArgs))()
    .done(function(collectionName, docs) {
        if (docs.length > 0) {
          // pathは一意なので、かならず1件
          if (!authUtils.checkAuth(docs[0].permission, auth, rw)) {
            return d.reject(new AppError(403, null, {
              message: '権限がありません'
            }));
          }
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
  function addFileAuthManeger(dbDao, mvFile) {
    var d = $.Deferred();
    if (mvFile.owner || mvFile.group || mvFile.permission) {
      var daoArgs = {};
      var permission = {}
      permission['path'] = mvFile.to;
      if (mvFile.owner) {
        permission['owner'] = mvFile.owner;
      }
      if (mvFile.group) {
        permission['group'] = mvFile.group;
      }
      if (mvFile.permission) {
        permission['permission'] = mvFile.permission;
      }

      daoArgs['colName'] = '_FILE';
      daoArgs['doc'] = {};
      daoArgs['doc']['permission'] = permission
      daoArgs['selector'] = {};
      daoArgs['selector']['permission'] = {
        path: mvFile.to
      };
      daoArgs['upsert'] = true;
      (dbDao.update(daoArgs))()
      .done(function() {
          d.resolve();
        })
        .fail(function(e) {
          d.reject(e);
        });
    } else {
      d.resolve();
    }
    return d.promise();
  }

  //
  //
  // インスタンスメソッド
  //
  //

  var p = FileService.prototype;

  p.get = serviceFunc(function(d, reqParams, meta) {
    loadFiles(this.fileDao, this.dbDao, reqParams, meta, resolve(d), reject(d));
  });

  p.post = serviceFunc(function(d, reqParams, meta) {
    doUploadFiles(this.fileDao, this.dbDao, reqParams, meta, resolve(d), reject(d));
  });

  p.patch = serviceFunc(function(d, reqParams, meta) {
    doUploadFiles(this.fileDao, this.dbDao, reqParams, meta, resolve(d), reject(d));
  });

  p.delete = serviceFunc(function(d, filePath, meta) {
    var files = _.isArray(filePath) ? filePath : [filePath];
    removeFiles(this.fileDao, this.dbDao, files, meta, resolve(d), reject(d));
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
