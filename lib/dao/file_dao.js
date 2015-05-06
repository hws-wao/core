var fs = require('fs'),
  path = require('path'),
  mkdirp = require('mkdirp'),
  rimraf = require('rimraf'),
  util = require('util'),
  mv = require('mv'),
  unzip = require('unzip2'),
  mime = require('mime'),
  crypto = require('crypto');

// WAO用のFile I/O操作クラス
var FileDao = (function () {

  // Constructer
  // @param {string} baseDir 必ず安全なディレクトリを設定しないといけない。
  var FileDao = function (args) {
    var baseDir = args.baseDir;

    if (!fs.existsSync(baseDir)) {
      mkdirp.sync(baseDir);
    }

    if (!fs.statSync(baseDir).isDirectory()) {
      throw new Error('baseDir[' + baseDir + '] is not Directory.')
    }

    this.baseDir = path.resolve(baseDir);
    this.defaultEncoding = 'UTF-8';
  };

  var p = FileDao.prototype;

  // ファイル読み込み処理
  //
  // ファイルの内容を全て返す
  // @param {string} path 読み込みたいファイルのパス
  // @return {string} ファイルの内容
  p.read = function (args) {
    var filePath = args.path;
    this.checkRequiredArg(filePath, 'path');

    var filePathAbs = path.resolve(path.join(this.baseDir, filePath));
    if (!this.checkPermission(filePathAbs)) {
      throw new Error('Permission Error. [' + filePath + ']');
    }
    if (!fs.existsSync(filePathAbs)) {
      throw new Error('specified file (' + filePath + ') is not found.');
    }
    if (!fs.statSync(filePathAbs).isFile()) {
      throw new Error('filePath [' + filePath + '] is not file.');
    }

    return fs.readFileSync(filePathAbs, {
      encoding: this.defaultEncoding
    });
  };

  // ファイルの書き込み処理
  //
  // @param {string} path 書き込むファイルのパス
  // @param {string} text ファイルに書き込む内容
  // @return {void}
  p.write = function (args) {
    var filePath = args['path'];
    this.checkRequiredArg(filePath, 'path');

    var filePathAbs = path.resolve(path.join(this.baseDir, filePath));
    if (!this.checkPermission(filePathAbs)) {
      throw new Error('Permission Error. [' + filePath + ']')
    }
    if (fs.existsSync(filePathAbs) && !fs.statSync(filePathAbs).isFile()) {
      throw new Error('filePath [' + filePath + '] is not file.');
    }

    if (!fs.existsSync(path.dirname(filePathAbs))) {
      mkdirp.sync(path.dirname(filePathAbs))
    }

    var text = args['text'] || '';

    var fd = fs.openSync(filePathAbs, 'w');
    fs.writeSync(fd, text, 0, this.defaultEncoding);
    fs.closeSync(fd);
  };

  // 指定したパスのファイル・ディレクトリを削除する
  //
  // @param {string}
  p.unlink = function (args) {
    var filePath = args['path'];
    this.checkRequiredArg(filePath, 'path');

    var filePathAbs = path.resolve(path.join(this.baseDir, filePath));
    if (!this.checkPermission(filePathAbs)) {
      throw new Error('Permission Error. [' + filePath + ']')
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
  p.stat = function (args) {
    var filePath = args['path'];
    this.checkRequiredArg(filePath, 'path');

    var filePathAbs = path.resolve(path.join(this.baseDir, filePath));
    if (!this.checkPermission(filePathAbs)) {
      throw new Error('Permission Error. [' + filePath + ']')
    }

    var fileStat = fs.statSync(filePathAbs);

    return util.inspect(fileStat);
  };

  // 指定したパスが存在するかを確認する
  p.exists = function (args) {
    var filePath = args['path'];
    this.checkRequiredArg(filePath, 'path');

    var filePathAbs = path.resolve(path.join(this.baseDir, filePath));
    if (!this.checkPermission(filePathAbs)) {
      throw new Error('Permission Error. [' + filePath + ']')
    }

    return fs.existsSync(filePathAbs);
  };

  // mkdir -p をnodeで実現する
  // @param {string} path 作成したいディレクトリのパス
  p.mkdirp = function (args) {
    var dirPath = args['path'];
    this.checkRequiredArg(dirPath, 'path');

    var filePathAbs = path.resolve(path.join(this.baseDir, dirPath));
    if (!this.checkPermission(filePathAbs)) {
      throw new Error('Permission Error. [' + dirPath + ']')
    }

    mkdirp.sync(filePathAbs);
  };

  // ファイルを移動する
  //
  // @param {object} mvFileList ファイルをどこからどこに移動するか
  //   @param {string} from ファイル移動元
  //   @param {string} to ファイル移動先
  p.mvFiles = function (args) {
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
      if (path.extname(mvFile.from) === '.zip' && path.extname(mvFile.to) !==
        '.zip') {
        rimraf.sync(to);
        fs.createReadStream(mvFile.from)
          .pipe(unzip.Extract({
            path: to
          }))
          .on('entry', function (entry) {
            var data = '';
            entry.on('data', function (chunk) {
              data += chunk
            });
            entry.on('end', function() {});
          });

        // FIXME: resolveのタイミングをzip解凍後に修正する。
        d.resolve();
      } else {
        // ディレクトリの場合(最後が/の場合。path.resolveすると最後の/が消えるから、mvFile.toで確認する)
        if (mvFile.to.match(/\/$/)) {
          fs.readFile(mvFile.from, function (err, data) {
            var shasum = crypto.createHash('sha1');
            var hash = shasum.update(data).digest('hex');
            var ext = path.extname(mvFile.from).toLowerCase();
            mv(mvFile.from, to + '/' + hash + ext, {
              mkdirp: true
            }, function () {
              d.resolve();
            });
          });
        } else {
          mv(mvFile.from, to, {
            mkdirp: true
          }, function () {
            d.resolve();
          });
        }
      }

      promises.push(d.promise());
    }

    $.when.apply(null, promises).done(function () {
      dfd.resolve();
    });

    return dfd.promise();
  };

  p.makeAbsolutePath = function (filePath) {
    return path.resolve(path.join(this.baseDir, filePath));
  }

  // 必須の引数を確認する
  //
  // @param {string} arg 確認したい値
  // @throws {Error} argがundefinedかブランクだった場合、例外を発生する
  // @return {void}
  p.checkRequiredArg = function (arg, paramName) {
    if (arg == undefined || arg == '') {
      throw new Error(paramName + ' is required.');
    }
  };

  // filePathのPermissionを確認する。
  //
  // 読み込む許可があり、baseDir以下だったらtrue、そうじゃなければfalseを返す
  // @param {string} filePath チェックしたいファイルのパス
  // @return {boolean}
  p.checkPermission = function (filePath) {
    return filePath.lastIndexOf(this.baseDir, 0) === 0 ? true : false;
  };

  p.readDirRecursive = function (dir) {
    var walk = function(p) {
      var files = fs.readdirSync(p);
      var results = [];

      files.map(function(file) {
          return path.join(p, file);
        })
        .filter(function(file) {
          if (fs.statSync(file).isDirectory()) {
            var _file = walk(file);
            var stat = fs.statSync(file);
            results.push({
              name: path.basename(file),
              files: _file,
              type: 'directory',
              time: stat.mtime
            });
          }
          return fs.statSync(file).isFile();
        })
        .forEach(function(file) {
          var stat = fs.statSync(file);
          results.push({
            name: path.basename(file),
            type: 'file',
            time: stat.mtime,
            mime: mime.lookup(path.basename(file))
          });
        });

      return results;
    };

    return walk(this.baseDir + dir);
  };

  return FileDao;

})();

module.exports = FileDao;
