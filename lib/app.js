'use strict';

// 利用するnode_modulesの定義
var http = require('http'),
  mongo = require('mongodb'),
  url = require('url'),
  path = require('path'),
  Server = require('mongodb').Server;

// 利用するクラス（コンストラクタ）の定義
var RequestHandler = require('./request/handler'),
  ResponseBuilder = require('./response/builder'),
  ServiceManager = require('./service'),
  Logger = require('./utils/logger');
// 内部モジュール読み込み
/** WAO用DB処理クラス */
var DbService = require('./service/db_service');
/** WAO用Cookie処理クラス */
var CookieService = require('./service/cookie_service');
/** WAO用Session処理クラス */
var SessionService = require('./service/session_service');
/** WAO用eメール処理クラス */
var MailService = require('./service/mail_service');
/** WAO用ファイル処理クラス */
var FileService = require('./service/file_service');

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
    var defaultBaseDir = global.serverBaseDir || 'apps/' + this.getAppId();
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
      var parsedRequest;
      var parsedMedhod;
      var serviceManager = new ServiceManager(that);
      var sessionService = new SessionService(that);
      serviceManager.setService({
        key: '_DB',
        service: new DbService(that)
      });
      serviceManager.setService({
        key: '_COOKIE',
        service: new CookieService(that)
      });
      serviceManager.setService({
        key: '_SES',
        service: sessionService
      });
      serviceManager.setService({
        key: '_MAIL',
        service: new MailService(that)
      });
      serviceManager.setService({
        key: '_FILE',
        service: new FileService(that)
      });
      var templatepath; // URLからテンプレートファイルの場所を特定する

      // 【手順.01】まず最初にリクエストを解析する
      var doParseReq = function() {
        var promise;
        // TODO:荒井 非公開ディレクトリのパスを復号して、_FILEに格納する
        // templatesもここで付ける
        templatepath = url.parse(request.url).pathname;
        var extname = path.extname(templatepath);
        if (extname === '.html' || extname === '.json') {
          promise = requestHandler.handle();
          resultForReq = {
            reqid: requestHandler.reqid
          };
        } else {
          var d = $.Deferred();
          promise = d.promise();
          d.resolve({});
        }
        return promise;
      };
      // 【手順.02】テンプレートの読み込み
      var doLoadTemplate = function(req) {
        var promise;
        parsedRequest = req;
        if (!parsedRequest._COOKIE) {
          parsedRequest._COOKIE = {};
        }
        parsedRequest._COOKIE['wao-session-id'] = sessionService.getSessionId();
        parsedMedhod = parsedRequest._method;
        resultForReq = $.extend(resultForReq, {});
        var mtime = (templatepath in that._DOM) ? that._DOM[templatepath].mtime : undefined;
        // TODO:青柳 loadで権限チェックする
        promise = responseBuilder.load(templatepath, mtime, resultForReq.reqid);
        return promise;
      };
      // 【手順.03】権限チェック
      var doAuthCheck = function(template) {
        var promise;
        that._DOM[templatepath] = $.extend(that._DOM[templatepath], template);
        templatepath = template.path;
        var extname = path.extname(templatepath);
        if (extname === '.html') {
          var auth = responseBuilder.getAuth(that._DOM[templatepath]);
          if (auth) {
            // TODO:セッションオブジェクトを渡す
            promise = responseBuilder.authCheck({
              'auth_login_id': '123456',
              'auth_login_group': 'admin'
            }, auth);
          }
        } else {
          // TODO:青柳　HTMLではないtemplates配下のファイルはここで権限チェック
          // ファイル管理テーブルに情報があれば権限をチェックする
          // ファイル管理テーブル情報は、サーバー開始時にapppIdを条件にメモリに展開しておく
        }
        if (!promise) {
          var d = $.Deferred();
          promise = d.promise();
          d.resolve({});
        }
        return promise;
      };
      // 【手順.04】リクエスト　→　データストア　→　処理結果
      var doCrud = function() {
        var promise;
        // GET,POST,PATCH,DELETE のいずれかかチェック
        if (DEFAULT_METHODS.indexOf(parsedRequest._method)) {
          // TODO:暫定 ServiceへのパラメータにMETA情報をセット。権限情報など
          var meta = {
            '_AUTH': {
              '_owner': '12345',
              '_group': ['admin999', 'admin1']
            }
          };
          // HTTPの規定メソッドなら、対応したServiceを呼び出す
          promise = serviceManager.exec(parsedRequest, meta);
        } else {
          // TODO kimura マクロ処理を呼び出す
        }
        return promise;
      };
      // 【手順.05】
      var doCrudShort = function(result) {
        var promise;
        resultForReq = $.extend(resultForReq, result); // 処理結果を保持する
        resultForReq._REQ = fetchRequestParams(parsedRequest);

        // 足りないデータを取得
        // bind用データで不足しているパラメタを取り出す
        var list = {}; //responseBuilder.getShortList(template, resultForReq);
        promise = serviceManager.exec(list); // 不足したデータを取得
        return promise;
      };
      // 【手順.06】レスポンス
      var doResponse = function(result) {
        var d = $.Deferred();
        // 保持した処理結果と先ほどの処理結果をマージする
        resultForReq = $.extend(resultForReq, result);
        var tmp = that._DOM[templatepath];
        if (parsedMedhod && parsedMedhod.toLowerCase() !== 'get') {
          tmp.status = 303;
          tmp.redirect = request.url; // FIXME kimura 相対パスはRFC違反
        }
        responseBuilder.build(tmp, resultForReq);
        d.resolve();
        return d.promise();
      };

      // もろもろ実行！！
      // ソースを見やすくするためにダミーのDeferredを作成、すぐにresolveする
      $.Deferred().resolve()
        .then(doParseReq) // 【手順.01】まず最初にリクエストを解析する
        .then(doLoadTemplate) // 【手順.02】テンプレートの読み込み
        .then(doAuthCheck) // 【手順.03】権限チェック
        .then(doCrud) // 【手順.04】リクエスト　→　データストア　→　処理結果
        .then(doCrudShort) // 【手順.05】
        .then(doResponse) // 【手順.06】レスポンス
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
    /* TODO kimura
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
