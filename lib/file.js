var fs     = require('fs'),
    path   = require('path'),
    mkdirp = require('mkdirp'),
    rimraf = require('rimraf'),
    util   = require('util'),
    undefined;

// WAO用のFile I/O操作クラス
var File = (function() {

  // Constructer
  // @param {string} baseDir 必ず安全なディレクトリを設定しないといけない。
  var File = function(args) {
    var baseDir = args['baseDir'];

    if (!fs.existsSync(baseDir)) {
      mkdirp.sync(baseDir);
    }

    if (!fs.statSync(baseDir).isDirectory()) {
      throw new Error('baseDir[' + baseDir + '] is not Directory.')
    }

    this.baseDir = path.resolve(baseDir);
    this.defaultEncoding = 'UTF-8';
  };

  var p = File.prototype;

  // ファイル読み込み処理
  //
  // ファイルの内容を全て返す
  // @param {string} path 読み込みたいファイルのパス
  // @return {string} ファイルの内容
  p.read = function(args) {
    var filePath = args['path'];
    this.checkRequiredArg(filePath, 'filePath');

    var filePathAbs = path.resolve(path.join(this.baseDir, filePath));
    if (!this.checkPermission(filePathAbs)) { throw new Error('Permission Error. [' + filePath + ']') }
    if (!fs.existsSync(filePathAbs))        { throw new Error('specified file (' + filePath + ') is not found.') }
    if (!fs.statSync(filePathAbs).isFile()) { throw new Error('filePath [' + filePath + '] is not file.') }

    return fs.readFileSync(filePathAbs, { encoding: this.defaultEncoding });
  };

  // ファイルの書き込み処理
  //
  // @param {string} path 書き込むファイルのパス
  // @param {string} text ファイルに書き込む内容
  // @return {void}
  p.write = function(args) {
    var filePath = args['path'];
    this.checkRequiredArg(filePath, 'path');

    var filePathAbs = path.resolve(path.join(this.baseDir, filePath));
    if (!this.checkPermission(filePathAbs)) { throw new Error('Permission Error. [' + filePath + ']') }
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
  p.unlink = function(args) {
    var filePath = args['path'];
    this.checkRequiredArg(filePath, 'path');

    var filePathAbs = path.resolve(path.join(this.baseDir, filePath));
    if (!this.checkPermission(filePathAbs)) { throw new Error('Permission Error. [' + filePath + ']') }

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
    var filePath = args['path'];
    this.checkRequiredArg(filePath, 'path');

    var filePathAbs = path.resolve(path.join(this.baseDir, filePath));
    if (!this.checkPermission(filePathAbs)) { throw new Error('Permission Error. [' + filePath + ']') }

    var fileStat = fs.statSync(filePathAbs);

    return util.inspect(fileStat);
  };

  // 指定したパスが存在するかを確認する
  p.exists = function(args) {
    var filePath = args['path'];
    this.checkRequiredArg(filePath, 'path');

    var filePathAbs = path.resolve(path.join(this.baseDir, filePath));
    if (!this.checkPermission(filePathAbs)) { throw new Error('Permission Error. [' + filePath + ']') }

    return fs.existsSync(filePathAbs);
  };

  // 必須の引数を確認する
  //
  // @param {string} arg 確認したい値
  // @throws {Error} argがundefinedかブランクだった場合、例外を発生する
  // @return {void}
  p.checkRequiredArg = function(arg, paramName) {
    if (arg == undefined || arg == '') { throw new Error(paramName + ' is required.'); }
  };

  // filePathのPermissionを確認する。
  //
  // 読み込む許可があり、baseDir以下だったらtrue、そうじゃなければfalseを返す
  // @param {string} filePath チェックしたいファイルのパス
  // @return {boolean}
  p.checkPermission = function(filePath) {
    return filePath.lastIndexOf(this.baseDir, 0) === 0 ? true : false;
  }

  return File;

})();

module.exports = File;
