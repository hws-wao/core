/**
 * @file Service層のマネジメントクラス。
 *
 * @author kimuramanabu
 * @version 2.2.0
 *
 * @module hws-wao/lib/service/index.js
 */
'use strict';

// 外部モジュール読み込み
/** npm util : ユティリティクラス */
var util = require('util');

// 内部モジュール読み込み
/** WAO用DB処理クラス */
var DbService = require('./db_service');
/** WAO用Cookie処理クラス */
var CookieService = require('./cookie_service');
/** WAO用eメール処理クラス */
var MailService = require('./mail_service');
/** WAO用ファイル処理クラス */
var FileService = require('./file_service');

/**
 * @class ServiceManager<br>
 * Service層のマネジメントクラス
 *
 * @param {object} app Appクラス
 */
var ServiceManager = (function() {
  var ServiceManager = function(app) {
    this.services = {
      _DB: new DbService(app),
      _COOKIE: new CookieService(app),
      _MAIL: new MailService(app),
      _FILE: new FileService(app)
    };
    this.app = app;
  };

  /**
   * サービスの実行
   *
   * @param {object} args パラメタ群
   * @param {string} args._method メソッド文字列(POST|GET|DELETE|PATCH)
   * @param {object} args._DB|_FILE|_MAIL|_COOKIE|_SES 処理対象パラメタ
   */
  ServiceManager.prototype.exec = function(args) {
    var d = $.Deferred();
    var ret = {};
    var myPromises = []; // 各サービスの処理完了同期用promise配列
    var that = this;
    var method = args._method; // メソッド名を取り出す
    delete args._method; // メソッド名は処理対象パラメタではないため、削除
    var props = Object.keys(args); // 処理対象のパラメタ名を一覧形式で取得
    // サービスの終了をハンドリング
    var callback = function(result) {
      that.app.logger.info('  Return Service:' + util.inspect(result));
      ret = $.extend(ret, result); // 全体の処理結果に個別のService処理結果を追加
    };
    // 処理対象パラメタの分だけ繰り返す（パラメタ名に対応したサービスの呼び出し）
    for (var idx in props) {
      var key = props[idx];
      var value = args[key];
      var myPromise = this.services[key][method](key, value);
      myPromise
        .done(callback)
        .fail(function() {});
      myPromises.push(myPromise); // 同期用に配列へ格納
    }
    // サービスの同期処理（すべての処理が完了するのを待つ）
    $.when.apply(null, myPromises).then(function() {
      that.app.logger.info('  End Service:' + util.inspect(ret));
      d.resolve(ret);
    });
    return d.promise();
  };

  return ServiceManager;
})();

module.exports = ServiceManager;