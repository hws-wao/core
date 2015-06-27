'use strict';

var CookieDao = require('../dao/cookie_dao');

// WAO用のCookie処理本体
var CookieService = (function() {

  // コンストラクタ
  var CookieService = function(app) {
    this.cookieDao = new CookieDao({
      request: app.request
    });
  };

  // メソッド定義用
  var p = CookieService.prototype;

  // Cookieの取得処理
  p.get = function(key, value, meta) {
    var d = $.Deferred();
    // valueは文字列（Cookie名）の配列である想定で
    // パラメタチェックせずに次処理へ回す
    //　（次処理でパラメタチェックは行われる）
    var ret = {};
    ret[key] = this.cookieDao.get(value);
    d.resolve(ret);
    return d.promise();
  };

  // Cookieの追加処理（あれば更新処理）
  p.post = function(key, value, meta) {
    var d = $.Deferred();
    var ret = {};
    ret[key] = this.cookieDao.set(value);
    d.resolve(ret);
    return d.promise();
  };

  // Cookieの更新処理（なければ追加処理）
  p.patch = function(key, value, meta) {
    var d = $.Deferred();
    d.resolve(this.post(key, value)); // POSTと同じ処理
    return d.promise();
  };

  // Cookieの削除処理
  p.delete = function(key, value, meta) {
    var d = $.Deferred();
    // valueは文字列（Cookie名）の配列である想定で
    // パラメタチェックせずに次処理へ回す
    //　（次処理でパラメタチェックは行われる）
    var ret = {};
    ret[key] = this.cookieDao.remove(value);
    d.resolve(ret);
    return d.promise();
  };

  return CookieService;
})();

module.exports = CookieService;
