'use strict';

// 利用するnpmパッケージの定義
var cookie = require('cookie');

/**
 * WAO用のCookie操作クラス
 * @class
 */
var CookieDao = (function() {
  /**
   * HTTPヘッダ出力用処理結果格納オブジェクト
   * @const {object}
   */
  var RESULT_TEMPLATE = {
    _header: {
      'Set-Cookie': []
    }
  };

  /**
   * コンストラクタ
   * @constructor
   * @param {request} 'request' : HTTPリクエスト
   */
  var CookieDao = function(args) {
    // TODO kimura Cookieごとに期限を設定できるようにする予定
    this.expireDay = 7; // cookieの有効期限
    var rawCookie = args.request.headers.cookie ? args.request.headers.cookie : '';
    this.cookieObj = cookie.parse(rawCookie);
    this.now = new Date(); // 現在時刻
    var expires = new Date(this.now.getTime() + day2Sec(this.expireDay) * 1000);
    // 有効期限は現在時刻から７日後
    this.options = {
      maxAge: day2Sec(this.expireDay),
      expires: expires
    };
  };

  /** メソッド定義用 */
  var p = CookieDao.prototype;

  /**
   * Cookieの削除
   * @param {array} 削除したいCookieの名前（配列）
   */
  p.remove = function(args) {
    var res = $.extend(true, {}, RESULT_TEMPLATE);
    // パラメタチェック
    args = (typeof args === 'string') ? [args] : args;
    if (!Array.isArray(args)) {
      throw '/wao/lib/dao/cookie_dao.js: remove(): args is not array.';
    }
    // 削除処理：有効期限を過去日に設定したHTTPヘッダーを送信することで実現する
    var expires = new Date(this.now.getTime() - day2Sec(this.expireDay) * 1000);
    for (var i = 0; i < args.length; i++) {
      var key = args[i];
      // オブジェクトからもデータを削除する
      delete res[key];
      delete this.cookieObj[key];
      // 削除用HTTPヘッダ値の作成
      res._header['Set-Cookie'].push(cookie.serialize(key, '', {
        expires: expires // 過去の日付を指定　→　削除
      }));
    }
    return res;
  };

  /**
   * Cookieの更新
   * @param {object} Cookieに出力するkey-value(valueは文字列のみ可)
   */
  p.set = function(args) {
    var res = $.extend(true, {}, RESULT_TEMPLATE);
    // key-valueで指定されたものはすべて保存する
    var props = Object.keys(args);
    for (var idx in props) {
      var key = props[idx];
      var value = args[key];
      // 型チェック：文字列じゃないとCookieに設定できない
      if (typeof value !== 'string') {
        throw 'set cookie value is not string. key=' + key;
      }
      // Result作成
      res[key] = value;
      this.cookieObj[key] = value; // 内部オブジェクトにも追加
      // Cookie保存用HTTPヘッダ値の作成
      res._header['Set-Cookie'].push(cookie.serialize(key, value, this.options));
    }
    return res;
  };

  /**
   * Cookieから情報を取得する
   * @param {array} 取得したいCookieの名前（配列）
   */
  p.get = function(args) {
    var res = {};
    // パラメタチェック
    args = (typeof args === 'string') ? [args] : args;
    if (!Array.isArray(args)) {
      throw '/wao/lib/dao/cookie_dao.js: get(): args is not array.';
    }
    // Cookieから情報を取得
    for (var i = 0; i < args.length; i++) {
      var key = args[i];
      var value = this.cookieObj[key];
      // 値をチェック
      if (!value) {
        throw '/wao/lib/dao/cookie_dao.js: get(): cookie is not found. key=' + key;
      }
      // Result作成
      res[key] = value;
      // HTTPヘッダ値情報は作成しない
    }
    return res;
  };

  /**
   * 日数を秒数に変換する
   * @param {int} 変換前の日数
   */
  function day2Sec(day) {
    return day * 24 * 60 * 60;
  }

  return CookieDao;
})();

module.exports = CookieDao;