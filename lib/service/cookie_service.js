'use strict';

var CookieDao = require('../dao/cookie_dao');

// WAO用のCookie処理本体
var CookieService = (function() {

  // コンストラクタ
  var CookieService = function(app) {
    this.cookieDao = new CookieDao({ request: app.request });
  };

  // メソッド定義用
  var p = CookieService.prototype;

  // Cookieの取得処理
  p.get = function(args) {
    var d = $.Deferred();
    // argsは文字列（Cookie名）の配列である想定で
    // パラメタチェックせずに次処理へ回す
    //　（次処理でパラメタチェックは行われる）
    d.resolve(this.cookieDao.get(args));
    return d.promise();
  };

  // Cookieの追加処理（あれば更新処理）
  p.post = function(args) {
    var d = $.Deferred();
    d.resolve(this.cookieDao.set(args));
    return d.promise();
  };

  // Cookieの更新処理（なければ追加処理）
  p.patch = function(args) {
    var d = $.Deferred();
    d.resolve(this.post(args)); // POSTと同じ処理
    return d.promise();
  };

  // Cookieの削除処理
  p.delete = function(args) {
    var d = $.Deferred();
    // argsは文字列（Cookie名）の配列である想定で
    // パラメタチェックせずに次処理へ回す
    //　（次処理でパラメタチェックは行われる）
    d.resolve(this.cookieDao.remove(args));
    return d.promise();
  };

  return CookieService;
})();

module.exports = CookieService;