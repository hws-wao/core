'use strict';
var fs = require('fs'),
  path = require('path'),
  mkdirp = require('mkdirp'),
  rimraf = require('rimraf'),
  util = require('util'),
  mv = require('mv'),
  unzip = require('unzip2'),
  mime = require('mime');
var AppError = require('./app_error');

// WAO用のFile I/O操作クラス
var File = (function() {

  var defaultEncoding = 'UTF-8';

  //
  // Constructer
  // @param {string} baseDir 必ず安全なディレクトリを設定しないといけない。
  var File = function(args) {
    var baseDir = args.baseDir;
    if (!fs.existsSync(baseDir)) {
      mkdirp.sync(baseDir);
    }
    if (!fs.statSync(baseDir).isDirectory()) {
      var msg = 'baseDir[' + baseDir + '] is not Directory.';
      throw new Error(msg);
    }
    this.baseDir = path.resolve(baseDir);
  };

  var p = File.prototype;

  // ファイル読み込み処理
  //
  // ファイルの内容を全て返す
  // @param {string} path 読み込みたいファイルのパス
  // @return {Promise}
  p.read = function(args) {
    var d = $.Deferred();
    var filePath = path.resolve(path.join(this.baseDir, args.path));

    checkPermission(this.baseDir, filePath)
      .then(isExists)
      .then(isFile)
      .then(readFile)
      .done(function(html) {
        d.resolve(html);
      })
      .fail(function(e) {
        d.reject(new AppError(e.status, null, {
          message: e.message
        }));
      });
    return d.promise();
  };

  // ファイルの書き込み処理
  //
  // @param {string} path 書き込むファイルのパス
  // @param {string} text ファイルに書き込む内容
  // @return {void}
  p.write = function(args) {
    var filePath = args.path;
    this.checkRequiredArg(filePath, 'path');
    var filePathAbs = path.resolve(path.join(this.baseDir, filePath));
    if (!this.checkPermission(filePathAbs)) {
      throw new Error('Permission Error. [' + filePath + ']');
    }
    if (fs.existsSync(filePathAbs) && !fs.statSync(filePathAbs).isFile()) {
      throw new Error('filePath [' + filePath + '] is not file.');
    }
    if (!fs.existsSync(path.dirname(filePathAbs))) {
      mkdirp.sync(path.dirname(filePathAbs));
    }
    var text = args.text || '';
    var fd = fs.openSync(filePathAbs, 'w');
    fs.writeSync(fd, text, 0, this.defaultEncoding);
    fs.closeSync(fd);
  };

  // 指定したパスのファイル・ディレクトリを削除する
  //
  // @param {string}
  p.unlink = function(args) {
    var filePath = args.path;
    this.checkRequiredArg(filePath, 'path');
    var filePathAbs = path.resolve(path.join(this.baseDir, filePath));

    if (!this.checkPermission(filePathAbs)) {
      throw new Error('Permission Error. [' + filePath + ']');
    }

    if (fs.statSync(filePathAbs).isFile()) {
      fs.unlinkSync(filePathAbs);
    } else if (fs.statSync(filePathAbs).isDirectory()) {
      // FIXME: It can remove stuff synchronously, too. But that's not so good. Use the async API. It's better.
      // refs https://github.com/isaacs/rimraf
      rimraf.sync(filePathAbs);
    }
  };

  // 指定したパスのファイルの情報を取得する
  // @param {string} path 情報を取得したいファイルのパス
  // @return {object} ファイルの情報
  p.stat = function(args) {
    var filePath = args.path;
    this.checkRequiredArg(filePath, 'path');
    var filePathAbs = path.resolve(path.join(this.baseDir, filePath));
    if (!this.checkPermission(filePathAbs)) {
      throw new Error('Permission Error. [' + filePath + ']');
    }
    var fileStat = fs.statSync(filePathAbs);
    return util.inspect(fileStat);
  };

  // 指定したパスが存在するかを確認する
  p.exists = function(args) {
    var filePath = args.path;
    this.checkRequiredArg(filePath, 'path');
    var filePathAbs = path.resolve(path.join(this.baseDir, filePath));
    if (!this.checkPermission(filePathAbs)) {
      throw new Error('Permission Error. [' + filePath + ']');
    }
    return fs.existsSync(filePathAbs);
  };

  // mkdir -p をnodeで実現する
  // @param {string} path 作成したいディレクトリのパス
  p.mkdirp = function(args) {
    var dirPath = args.path;
    this.checkRequiredArg(dirPath, 'path');
    var filePathAbs = path.resolve(path.join(this.baseDir, dirPath));
    if (!this.checkPermission(filePathAbs)) {
      throw new Error('Permission Error. [' + dirPath + ']');
    }
    mkdirp.sync(filePathAbs);
  };

  // ファイルを移動する
  //
  // @param {object} mvFileList ファイルをどこからどこに移動するか
  //   @param {string} from ファイル移動元
  //   @param {string} to ファイル移動先
  p.mvFiles = function(args) {
    var dfd = $.Deferred();
    var promises = [];
    var mvFileList = args.mvFileList;
    for (var i = 0; i < mvFileList.length; i++) {
      var d = $.Deferred();
      var mvFile = mvFileList[i];
      var to = path.resolve(path.join(this.baseDir, 'templates', mvFile.to));
      if (!this.checkPermission(to)) {
        throw new Error('Permission Error. [' + to + ']');
      }

      if (isUnzipTarget(mvFile.from, mvFile.to)) {
        rimraf.sync(to);
        fs.createReadStream(mvFile.from)
          .pipe(unzip.Extract({
            path: to
          }))
          .on('entry', unzipEnd);

        // FIXME: resolveのタイミングをzip解凍後に修正する。
        d.resolve();
      } else {
        mv(mvFile.from, to, {
          mkdirp: true
        }, mvEnd(d));
      }
      promises.push(d.promise());
    }

    $.when.apply(null, promises)
      .done(function() {
        dfd.resolve();
      });

    return dfd.promise();
  };

  p.makeAbsolutePath = function(filePath) {
    return path.resolve(path.join(this.baseDir, filePath));
  };

  // 必須の引数を確認する
  //
  // @param {string} arg 確認したい値
  // @throws {Error} argがundefinedかブランクだった場合、例外を発生する
  // @return {void}
  p.checkRequiredArg = function(arg, paramName) {
    if (arg === undefined || arg === '') {
      throw new Error(paramName + ' is required.');
    }
  };

  // filePathのPermissionを確認する。
  //
  // 読み込む許可があり、baseDir以下だったらtrue、そうじゃなければfalseを返す
  // @param {string} filePath チェックしたいファイルのパス
  // @return {boolean}
  p.checkPermission = function(filePath) {
    return filePath.lastIndexOf(this.baseDir, 0) === 0 ? true : false;
  };

  p.readDirRecursive = function(dir, callback) {
    var walk = function(p, callback) {
      var results = [];
      fs.readdir(p, function(err, files) {
        if (err) {
          return callback(err, []);
        }
        var pending;
        if (files) {
          pending = files.length;
        }
        if (!pending) {
          return callback(null, results);
        }
        files.map(function(file) {
          return path.join(p, file);
        }).filter(function(file) {
          if (fs.statSync(file).isDirectory()) {
            walk(file, function(err, res) {
              var stat = fs.statSync(file);
              results.push({
                name: path.basename(file),
                files: res,
                type: 'directory',
                time: stat.mtime
              });
              if (!--pending) {
                callback(null, results);
              }
            });
          }
          return fs.statSync(file).isFile();
        }).forEach(function(file) {
          var stat = fs.statSync(file);
          results.push({
            name: path.basename(file),
            type: 'file',
            time: stat.mtime,
            mime: mime.lookup(path.basename(file))
          });
          if (!--pending) {
            callback(null, results);
          }
        });
      });
    };
    walk(dir, function(err, results) {
      if (err) {
        console.log('err: ' + err);
      }
      callback({
        files: results
      });
    });
  };

  /**
   * filePathへのアクセス権限があるかどうかを返す
   * アクセス可能なディレクトリ以下のパスであればtrueを返す
   * @param {string} baseDir アクセス可能のディレクトリ
   * @param {string} filePath
   * @return {Promise}
   */
  function checkPermission(baseDir, filePath) {
    var d = $.Deferred();
    _.startsWith(filePath, baseDir) ? d.resolve(filePath) : d.reject({
      status: 403,
      message: 'Forbidden'
    });
    return d.promise();
  }

  /**
   * filePathにファイルが存在することを確認する
   * @param {string} filePath 確認するファイルのパス
   * @return {Promise}
   */
  function isExists(filePath) {
    var d = $.Deferred();
    fs.exists(filePath, function(exists) {
      exists ? d.resolve(filePath) : d.reject({
        status: 404,
        message: 'Not Found'
      });
    });
    return d.promise();
  }

  /**
   * filePathがファイルかどうか
   * @param {string} filePath
   * @return {Promise}
   */
  function isFile(filePath) {
    var d = $.Deferred();
    fs.stat(filePath, function(err, stats) {
      stats.isFile() ?
        d.resolve(filePath) : d.reject({
          status: 403,
          message: 'Forbidden'
        });
    });
    return d.promise();
  }

  /**
   * ファイル読み込み処理
   * @param {string} filePath
   * @return {Promise}
   */
  function readFile(filePath) {
    var d = $.Deferred();
    fs.readFile(filePath, {
      encoding: defaultEncoding
    }, function(err, data) {
      if (err) {
        d.reject(err);
      } else {
        d.resolve(data);
      }
    });
    return d.promise();
  }

  function mvEnd(deferred) {
    return function() {
      deferred.resolve();
    };
  }

  function unzipEnd() {
    return function(entry) {
      var data = '';
      entry.on('data', function(chunk) {
        data += chunk;
      });
      entry.on('end', function() {
        // callback(null, data);
      });
    };
  }

  function isUnzipTarget(fromPath, toPath) {
    return path.extname(fromPath) === '.zip' &&
      path.extname(toPath) !== '.zip';
  }

  return File;
})();

module.exports = File;