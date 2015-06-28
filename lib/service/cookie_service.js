/**
 * @file CookieのServiceクラス。
 *
 * @author kimuramanabu
 * @version 2.2.0
 *
 * @module hws-wao/lib/service/cookie_service.js
 */
'use strict';

// 内部モジュール読み込み
/** CookieDAOクラス */
var CookieDao = require('../dao/cookie_dao');

/**
 * @class CookieService<br>
 * CookieのServiceクラス
 *
 * @param {object} app Appクラス
 */
var CookieService = (function() {
  var CookieService = function(app) {
    this.cookieDao = new CookieDao({
      request: app.request
    });
  };

  /**
   * Cookie情報の取得
   *
   * @param {string} key Cookie名
   * @param {object} value Cookieの値
   */
  CookieService.prototype.get = function(key, value, meta) {
    var d = $.Deferred();
    // valueは文字列（Cookie名）の配列である想定で
    // パラメタチェックせずに次処理へ回す
    //　（次処理でパラメタチェックは行われる）
    var ret = {};
    ret[key] = this.cookieDao.get(value);
    d.resolve(ret);
    return d.promise();
  };

  /**
   * Cookieの追加処理（あれば更新処理）
   *
   * @param {string} key Cookie名
   * @param {object} value Cookieの値
   */
  CookieService.prototype.post = function(key, value, meta) {
    var d = $.Deferred();
    var ret = {};
    ret[key] = this.cookieDao.set(value);
    d.resolve(ret);
    return d.promise();
  };

  /**
   * Cookieの更新処理（なければ追加処理）
   *
   * @param {string} key Cookie名
   * @param {object} value Cookieの値
   */
  CookieService.prototype.patch = function(key, value, meta) {
    return this.post(key, value);
  };

  /**
   * Cookieの削除処理
   *
   * @param {string} key Cookie名
   * @param {object} value 指定不要（IF統一のためにパラメタが存在する）
   */
  CookieService.prototype.delete = function(key, value, meta) {
    value = null;
    var d = $.Deferred();
    // valueは文字列（Cookie名）の配列である想定で
    // パラメタチェックせずに次処理へ回す
    //　（次処理でパラメタチェックは行われる）
    var ret = {};
    ret[key] = this.cookieDao.remove(key);
    d.resolve(ret);
    return d.promise();
  };

  return CookieService;
})();

module.exports = CookieService;
