'use strict';

var Puid = require('puid');
var CookieDao = require('./cookie_dao');

// WAO用のSession操作クラス
var SessionDao = (function() {
  var SESSION_ID = 'wao-session-id';
  var COLNAME = '_SES';

  // コンストラクタ
  var SessionDao = function(args) {
    // Sessionプロバイダが利用する他のプロバイダを初期化
    this.cookieDao = new CookieDao({
      request: args.request
    });
    this.db = args.db;
    this.ua = args.request.header.ua;

    // CookieからセッションIDを取得する
    var session_id = this.cookieDao.get({
      'colName': SESSION_ID
    });
    // セッションIDが取得できた？
    if (session_id) {
      loadSession(this, session_id); // セッション情報読み込み
    } else {
      // 新規セッション
      initSession(this); // セッションIDを作成する
    }
  };

  // セッション情報を読み込む
  function loadSession(that, session_id) {
    that.id = session_id; // セッションIDを決定
    that.cookieDao.set({
      SESSION_ID: that.id
    }); // Cookie更新（期限延長）
    // dbからセッション情報を取得する
    // TODO kimura 更新日を更新しないとガベージされちゃう。。。
    (that.db.find({
      'colName': COLNAME,
      'query': {
        'session_id': session_id,
        'ua': that.ua
      }
    }))()
    .done(function(colName, docs) {
        // データが取得できたら内部変数に保持する
        that.body = docs;
      })
      .fail(function(e) {
        throw e;
        // deferred.reject(e);
      });
  }

  // 新規セッション情報を初期化する
  function initSession(that) {
    that.id = (new Puid(SESSION_ID)).generate(); // セッションIDを払い出し
    that.cookieDao.set({
      SESSION_ID: that.id
    }); // セッションIDをCookieに出力
    // 空のセッション情報をdbに追加
    (that.db.insert({
      'colName': COLNAME,
      'docs': {
        'session_id': that.id,
        'ua': that.ua
      }
    }))()
    .done(function(colName, docs) {
        colName = colName;
        docs = docs;
      })
      .fail(function(e) {
        throw e;
      });
  }

  // メソッド定義用
  var p = SessionDao.prototype;

  // セッション情報の削除
  p.remove = function(args) {
    args = args;
    // TODO
  };

  // セッション情報の更新
  p.update = function(args) {
    this.body = $.extend(this.body, args);
    // TODO kimura dbへの更新は最後にまとめて。これならガベージ対策にもなる
  };

  // セッション情報の取得
  p.get = function(args) {
    args = args;
    return this.body;
  };

  return SessionDao;
})();

module.exports = SessionDao;