'use strict';

// 利用するnode_modulesの定義
var http = require('http'),
  mongo = require('mongodb'),
  Server = require('mongodb').Server;

// 利用するクラス（コンストラクタ）の定義
var RequestHandler = require('./request/handler'),
  //ResponseBuilder = require('./response/builder'),
  //ErrorHandler = require('./error_handler'),
  File = require('./model/provider/file'),
  ServiceManager = require('./service'),
  Logger = require('./utils/logger');

/**
 * アプリケーションクラス
 */
var App = (function() {
  var DEFAULT_METHODS = ['GET', 'POST', 'PATCH', 'DELETE'];

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
    this._HTML = {};

    this.startLogging(baseDir);

    // mongoDbを起動
    this.openDb();
  };

  /** メソッド定義用 */
  var p = App.prototype;

  /**
   * WEBアプリの開始
   */
  p.start = function() {
    this.logger.info('Start WAO Server on port: ' + this.port);
    this.server.listen(this.port);

    var that = this;
    this.server.on('request', function(request, response) {
      that.request = request;
      that.response = response;
      var param = {
        app: that,
        request: request,
        response: response
      };
      // リクエストの解析処理
      var requestHandler = new RequestHandler(param);
      // レスポンスの作成処理
      //var responseBuilder = new ResponseBuilder(param);
      // エラー処理
      //var errorHandler = new ErrorHandler(param);

      // まず最初にリクエストを解析する
      requestHandler.handle()
        .done(function(parsedRequest) {
          console.log('リクエスト解析終了＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝');
          console.log(parsedRequest);
          // GET,POST,PATCH,DELETE のいずれかかチェック
          if (DEFAULT_METHODS.indexOf(parsedRequest._method)) {
            var serviceManager = new ServiceManager(that);
            serviceManager.exec(parsedRequest)
              .done(function(result) {
                console.log('業務処理完了＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝');
                console.log(result);
              })
              .fail(function() {});
          } else {
            // TODO kimura マクロ処理を呼び出す
          }
        })
        .fail(function() {});
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

  p.openDb = function() {
    var that = this;
    this.mongoDb = new mongo.Db(
      this.getAppId(), new Server('localhost', mongo.Connection.DEFAULT_PORT, {}));

    this.mongoDb.open(function(err, db) {
      if (err !== null) {
        that.logger.error('Error open mongoDb connection');
        return;
      }
    });
  };

  return App;
})();

module.exports = App;
