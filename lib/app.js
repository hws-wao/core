'use strict';

// 利用するnode_modulesの定義
var http = require('http'),
  mongo = require('mongodb'),
  url = require('url'),
  Server = require('mongodb').Server;

// 利用するクラス（コンストラクタ）の定義
var RequestHandler = require('./request/handler'),
  ResponseBuilder = require('./response/builder'),
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
    this.wao = args.wao; // アプリ起動用(su)
    this.name = args.name;
    this.port = args.port;
    this._DOM = {};
    var defaultBaseDir = 'apps/' + this.getAppId();
    this.baseDir = args.baseDir || defaultBaseDir;
    this.server = http.createServer();

    this.startLogging(this.baseDir);

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
      var responseBuilder = new ResponseBuilder(param);
      // エラー処理
      //var errorHandler = new ErrorHandler(param);

      var resultForReq; // このリクエストに対応した処理結果格納領域
      var serviceManager = new ServiceManager(that);
      var path; // URLからテンプレートファイルの場所を特定する

      // 【手順.01】まず最初にリクエストを解析する
      var doParseReq = function() {
        that.logger.info('    doParseReq - Start');
        var promise;
        promise = requestHandler.handle();
        return promise;
      };
      // 【手順.02】リクエスト　→　データストア　→　処理結果
      var doCrud = function(parsedRequest) {
        that.logger.info('    doCrud - Start');
        var promise;
        // GET,POST,PATCH,DELETE のいずれかかチェック
        if (DEFAULT_METHODS.indexOf(parsedRequest._method)) {
          // HTTPの規定メソッドなら、対応したServiceを呼び出す
          promise = serviceManager.exec(parsedRequest);
        } else {
          // TODO kimura マクロ処理を呼び出す
        }
        return promise;
      };
      // 【手順.03】テンプレートの読み込み
      var doLoadTemplate = function(result) {
        that.logger.info('    doLoadTemplate - Start');
        var promise;
        resultForReq = result; // 処理結果を保持する
        path = url.parse(request.url).pathname;
        var updated = (path in that._DOM) ? that._DOM[path].updated : undefined;
        promise = responseBuilder.load(path, updated);
        return promise;
      };
      //
      var doCrudShort = function(template) {
        that.logger.info('    doCrudShort - Start');
        var promise;
        that._DOM[path] = $.extend(that._DOM[path], template);
        // 足りないデータを取得
        // bind用データで不足しているパラメタを取り出す
        var list = {};//responseBuilder.getShortList(template, resultForReq);
        promise = serviceManager.exec(list); // 不足したデータを取得
        return promise;
      };
      // 【手順.05】レスポンス
      var doResponse = function(result) {
        that.logger.info('    doParseReq - Start');
        var d = $.Deferred();
        // 保持した処理結果と先ほどの処理結果をマージする
        resultForReq = $.extend(resultForReq, result);
        responseBuilder.build(that._DOM[path], resultForReq);
        d.resolve();
        return d.promise();
      };

      // もろもろ実行！！
      // ソースを見やすくするためにダミーのDeferredを作成、すぐにresolveする
      $.Deferred().resolve()
        .then(doParseReq) // 【手順.01】まず最初にリクエストを解析する
        .then(doCrud) // 【手順.02】リクエスト　→　データストア　→　処理結果
        .then(doLoadTemplate) // 【手順.03】テンプレートの読み込み
        .then(doCrudShort)
        .then(doResponse) // 【手順.05】レスポンス
        .done(function() {
          // ダミー
        })
        .fail(function() {
          // TODO kimura エラー処理
        });
    });
  };

  /**
   * アプリのロギングを開始する
   */
  p.startLogging = function(baseDir) {
    var LOG_DIR = {
      path: 'logs'
    };
/*
    if (!this.file.exists(LOG_DIR)) {
      this.file.mkdirp(LOG_DIR);
    }
*/
    this.logger = new Logger({
      path: baseDir + '/' + LOG_DIR.path + '/application.log'
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

    this.mongoDb.open(function(err) {
      if (err !== null) {
        that.logger.error('Error open mongoDb connection');
        return;
      }
    });
  };

  /**
   * リクエストパラメータの中から、_method以外を取り出す
   * @param {object} parsedRequest - パースされたリクエストパラメータ
   * @return {object} - 引数のリクエストパラメータから_methodを抜いたもの
   */
  function fetchRequestParams(parsedRequest) {
    var params = {};
    Object.keys(parsedRequest).forEach(function(key) {
      if (key === '_method') {
        return true;
      }
      params[key] = parsedRequest[key];
    });

    return params;
  }

  return App;
})();

module.exports = App;
