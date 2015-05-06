'use strict';

var mailer = require('nodemailer');
var AppError = require('../dto/app_error');

var MailDao = (function() {

  var setting = {};

  var MailDao = function(args) {
    setting.host = args.host;
    setting.port = args.port;
    if (args.user) {
      setting.auth = {};
      setting.auth.user = args.user;
      setting.auth.pass = args.pass;
    }
  };

  var p = MailDao.prototype;

  p.send = function(args) {
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
