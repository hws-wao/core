/**
 * @file SessionのServiceクラス。
 *
 * @author kimuramanabu
 * @version 2.2.0
 *
 * @module hws-wao/lib/dao/session_dao.js
 */
'use strict';

/**
 * @class SessionDao<br>
 * Sessionのデータアクセスクラス<br>
 * セッション情報のデータストア先は本来DBだが
 * DBへの永続化とDBからの復旧はService層に任せているので
 * Daoではメモリ上(this._SES)にデータを展開、更新するのみ
 *
 * @param {App} app Appクラス
 * @param {object} _SES セッション情報（mongoDBから復旧したdocument）
 */
var SessionDao = (function() {
  var SessionDao = function(app, _SES) {
    this._SES = _SES;
  };

  /**
   * セッション情報の参照
   *
   * @param {object} args パラメタ群
   * @param {string} args.key 取得する値のキー名称
   */
  SessionDao.prototype.get = function(args) {
    // キーが指定してなければ全部を返却
    if (!args) {
      return this._SES;
    } else
    // キーが指定されていればその値を返却
    if (this._SES[args.key]) {
      return this._SES[args.key];
    } else {
      // 指定されたキーに該当する値がなければundefinedを返却
      return undefined;
    }
  };

  /**
   * セッション情報の更新
   *
   * @param {object} args パラメタ群
   * @param {string} args.key 設定する項目のキー名称
   * @param {object} args.value 設定する値
   */
  SessionDao.prototype.set = function(args) {
    this._SES[args.key] = args.value;
    return;
  };

  /**
   * セッション情報の削除
   *
   * @param {object} args パラメタ群
   * @param {string} args.key 削除する値のキー名称
   */
  SessionDao.prototype.remove = function(args) {
    var deleted = this._SES[args.key];
    delete this._SES[args.key];
    // 削除した値を返却する
    return deleted;
  };

  return SessionDao;
})();

module.exports = SessionDao;