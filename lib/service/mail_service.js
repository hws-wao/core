'use strict';

var config = require('config'),
  mailConfig = config.get('mail');
var MailDao = require('../dao/mail_dao');

var MailService = (function() {

  var MailService = function(app) {
    this.app = app;
    this.mailDao = new MailDao({
      "host": mailConfig.host,
      "port": mailConfig.port,
      "user": mailConfig.user,
      "pass": mailConfig.pass
    });
  };

  var p = MailService.prototype;

  p.get = function(key, value, meta) {
    return new $.Deferred().resolve({
      key: {}
    });
  };

  p.post = function(key, value, meta) {
    var d = $.Deferred();
    var result = {};
    result[key] = {};

    if (!value || Object.keys(value).length == 0) {
      return d.resolve(result);
    }

    if (value.from === undefined) {
      value.from = mailConfig.from;
    }

    if (config.debug_mode) {
      this.app.logger.info(value);
      return d.resolve(result);
    } else {
      result[key] = this.mailDao.send(value);
      return d.resolve(result);
    }
  };

  p.patch = function(key, value, meta) {
    return new $.Deferred().resolve({
      key: {}
    });
  };

  p.delete = function(key, value, meta) {
    return new $.Deferred().resolve({
      key: {}
    });
  };

  return MailService;
})();

module.exports = MailService;
