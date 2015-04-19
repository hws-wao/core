'use strict';

// 利用するnpmパッケージの定義
var http = require('http');
// 利用するmodule内のクラス（コンストラクタ）の定義
var RequestHandler = require('./request/handler'),
  ResponseBuilder = require('./response/builder'),
  ErrorHandler = require('./error_handler'),
  File = require('./model/provider/file'),
  Db = require('./dao/db_dao'),
  Logger = require('./utils/logger');

/**
 * アプリケーションクラス
 */
var App = (function() {

  /**
   * コンストラクタ
   */
  var App = function(args) {
    this.wao = args.wao;
    this.name = args.name;
    this.port = args.port;
    var defaultBaseDir = 'apps/' + this.getAppId();
    var baseDir = args.baseDir || defaultBaseDir;
    this.file = new File({
      baseDir: baseDir
    });
    this.server = http.createServer();
    this.db = new Db({
      dbName: this.getAppId()
    });
    this._HTML = {};

    this.startLogging(baseDir);
  };

  /** メソッド定義用 */
  var p = App.prototype;

  /**
   * WEBアプリの開始
   */
  p.start = function() {
    this.logger.info('Start WAO Server on port: ' + this.port);
    this.server.listen(this.port);

    this.db.open();

    var that = this;
    this.server.on('request', function(request, response) {
      var requestHandler = new RequestHandler({
        app: that,
        request: request
      });
      var responseBuilder = new ResponseBuilder({
        app: that,
        request: request,
        response: response
      });
      var errorHandler = new ErrorHandler({
        app: that,
        response: response
      });

      requestHandler.handle().done(function(result) {
          responseBuilder.build(result);
        })
        .fail(function(error) {
          errorHandler.handle(error);
        });
    });
  };

  /**
   * アプリのロギングを開始する
   */
  p.startLogging = function(baseDir) {
    if (!this.file.exists({
        path: 'logs'
      })) {
      this.file.mkdirp({
        path: 'logs'
      });
    }
    this.logger = new Logger({
      path: baseDir + '/logs/application.log'
    });
  };

  /**
   * WEBアプリの識別子を取得する
   */
  p.getAppId = function() {
    return this.name + '_' + this.port;
  };

  return App;
})();

module.exports = App;