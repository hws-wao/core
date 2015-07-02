/**
 * @file SessionのServiceクラス。
 *
 * @author kimuramanabu
 * @version 2.2.0
 *
 * @module hws-wao/lib/service/session_service.js
 */
'use strict';

// 外部モジュール読み込み
/** npm puid : セッションID払い出し用 */
var Puid = require('puid');

// 内部モジュール読み込み
/** CookieのDAOクラス */
var CookieDao = require('../dao/cookie_dao');
/** Session情報のDAOクラス */
var SessionDao = require('../dao/session_dao');
/** DBのDAOクラス */
var DbDao = require('../dao/db_dao');

/**
 * @class SessionService<br>
 * SessionのServiceクラス
 *
 * @param {App} app Appクラス
 */
var SessionService = (function() {
  var SessionService = function(app) {
    var that = this;
    var cookieDao = new CookieDao({
      request: app.request
    });
    this.dbDao = new DbDao(app);
    // cookieからsession-idを取得
    var sesId;
    try {
      sesId = cookieDao.get('wao-session-id')['wao-session-id'];
    } catch (e) {
      sesId = undefined;
    }
    var _SES;
    // 取得できた場合はDBからセッション情報を取得
    if (sesId) {
      this.dbDao.find({
        colName: '_SES',
        query: {
          'wao-session-id': sesId,
          'ua': app.request.headers['user-agent'] // 乗っ取り対策
        }
      })().then(function(colName, doc) {
        _SES = doc[0];
        if (!_SES) { // DB上にセッション情報が見つからなければ
          _SES = that.start({
            request: app.request
          }); // 新規セッション開始
        }
        that.sessionDao = new SessionDao(app, _SES);
      }).done(function() {
        //
      }).fail(function() {
        //
      });
    } else {
      // CookieにセッションIDが見つからなければ
      _SES = this.start({
        request: app.request
      }); // 新規セッション開始
      this.sessionDao = new SessionDao(app, _SES);
    }
  };

  SessionService.prototype.start = function(args) {
    return {
      'wao-session-id': (new Puid()).generate(),
      'ua': args.request.headers['user-agent']
    };
  };

  SessionService.prototype.getSessionId = function() {
    return this.sessionDao.get({
      key: 'wao-session-id'
    });
  };

  /**
   * Session情報の取得
   *
   * @param {string} key Session名
   * @param {object} value 指定不要（IF統一のためにパラメタが存在する）
   */
  SessionService.prototype.get = function(key, value) {
    value = null; // jshint対策
    var d = $.Deferred();
    var ret = {};
    ret[key] = this.sessionDao.get(key);
    d.resolve(ret);
    return d.promise();
  };

  /**
   * Sessionの追加処理（あれば更新処理）
   *
   * @param {string} key Session名
   * @param {string} value Sessionの値
   */
  SessionService.prototype.post = function(key, value) {
    var d = $.Deferred();
    var ret = {};
    ret[key] = this.sessionDao.set({
      key: key,
      value: value
    });
    d.resolve(ret);
    return d.promise();
  };

  /**
   * Sessionの更新処理（なければ追加処理）
   *
   * @param {string} key Session名
   * @param {string} value Sessionの値
   */
  SessionService.prototype.patch = function(key, value) {
    return this.post(key, value);
  };

  /**
   * Sessionの削除処理
   *
   * @param {string} key Session名
   * @param {object} value 指定不要（IF統一のためにパラメタが存在する）
   */
  SessionService.prototype.delete = function(key, value) {
    value = null; // jshint対策
    var d = $.Deferred();
    var ret = {};
    // 削除した値を返却する
    ret[key] = this.sessionDao.remove(key);
    d.resolve(ret);
    return d.promise();
  };　
  /**
   * セッション情報の永続化（DBへ保存）
   */
  SessionService.prototype.persistent = function() {
    var _SES = this.sessionDao.get(); // すべてのデータを取り出す
    (this.dbDao.update({
      colName: '_SES',
      selector: {
        'wao-session-id': _SES['wao-session-id'],
        // 乗っ取り対策としてUAも条件に追加する
        'ua': _SES.ua
      },
      doc: _SES,
      upsert: true
    }))()
    .done(function() {
        //
      })
      .fail(function() {
        //
      });
    return;
  };

  return SessionService;
})();

module.exports = SessionService;