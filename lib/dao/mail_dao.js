/**
 * @file MailのDaoクラス。
 *
 * @author aoyagi
 * @version 2.3.0
 *
 * @module hws-wao/lib/dao/mail_dao.js
 */
'use strict';

// 外部モジュール読み込み
/** npm nodemailer : メールを送信する */
var mailer = require('nodemailer');

// 内部モジュール読み込み
/** エラーオブジェクト（コンストラクタ） */
var AppError = require('../dto/app_error');

/**
 * @class MailDao<br>
 * MailのDaoクラス
 *
 * @param {object} args パラメタ群
 * @param {string} args.host SMTPサーバ名
 * @param {string} args.host SMTPポート
 * @param {string} args.user SMTP認証ユーザー
 * @param {string} args.pass SMTP認証パスワード
 */
var MailDao = (function() {
  var MailDao = function(args) {
    this.setting = {};
    this.setting.host = args.host;
    this.setting.port = args.port;
    if (args.user) {
      this.setting.auth = {};
      this.setting.auth.user = args.user;
      this.setting.auth.pass = args.pass;
    }
  };

  /**
   * メール送信
   * 
   * @param {object} args 送信メール情報
   * @param {string} args.from from
   * @param {string} args.to to
   * @param {string} args.subject subject
   * @param {string} args.text メール本文(plaintext)
   * @param {string} args.html メール本文(html)
   * @return {promise} 同期オブジェクト
   */
  MailDao.prototype.send = function(args) {
    var that = this;
    var d = $.Deferred();

    //SMTPの接続
    var smtp = mailer.createTransport(setting);

    //メールの送信
    smtp.sendMail(args, function(err, res) {
      if (err) {
        d.reject(new AppError(500, null, {
          message: 'メール送信に失敗しました。' + err
        }));
      } else {
        d.resolve();
      }
      //SMTPの切断
      smtp.close();
    });

    return d.promise();
  };

  return MailDao;
})();

module.exports = MailDao;
