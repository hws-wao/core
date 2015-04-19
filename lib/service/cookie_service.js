'use strict'

var CookieDao = require('../provider/cookie_dao'),
    undefined;

// WAO用のCookie処理本体
var CookieService = (function() {

  // コンストラクタ
  var CookieService = function(args) {
    this.cookieDao = new CookieDao({ request: args.app.request });
  };

  // メソッド定義用
  var p = CookieService.prototype;

  // Cookieの取得処理
  p.get = function(args) {
    // argsは文字列（Cookie名）の配列である想定で
    // パラメタチェックせずに次処理へ回す
    //　（次処理でパラメタチェックは行われる）
    return this.cookieDao.get(args);
  };

  // Cookieの追加処理（あれば更新処理）
  p.post = function(args) {
    return this.cookieDao.set(makeRequestSet(args));
  };

  // Cookieの更新処理（なければ追加処理）
  p.patch = function(args) {
    return this.post(args); // POSTと同じ処理
  };

  // Cookieの削除処理
  p.delete = function(args) {
    // argsは文字列（Cookie名）の配列である想定で
    // パラメタチェックせずに次処理へ回す
    //　（次処理でパラメタチェックは行われる）
    return this.cookieDao.remove(args);
  };

  // CookieDaoへ引きわたすパラメタの作成処理
  //
  // [{k:v},{k:v},...] を {k:v,k:v,...} に変換する
  function makeRequestSet(args) {
    var req = {};
    for (var i = 0; i < args.length; i++) {
      var props = Object.keys(args[i]);
      for (var idx in props) {
        var key = props[idx];
        var value = args[i][key];
        req[key] = value;
      }
    }
    return req;
  }

  return CookieService;
})();

module.exports = CookieService;