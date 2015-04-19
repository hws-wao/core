'use strict';

var config = require('config'),
  mailConfig = config.get('mail');
var MailDao = require('../dao/mail_dao');

var MailService = (function() {
  var dao = null;

  var MailService = function(args) {
    this.app = args.app;
    this.dao = new MailDao({
      "host": mailConfig.host,
      "port": mailConfig.port
    });
  };

  var p = MailService.prototype;

  p.get = function(args) {
    return new $.Deferred().resolve();
  };

  p.post = function(args) {

    if (!args || Object.keys(args).length == 0) {
      return new $.Deferred().resolve();
    }

    if (args.from === undefined) {
      args.from = mailConfig.from;
    }

    if (config.debug_mode) {
      this.app.logger.info(args);
      return new $.Deferred().resolve();
    } else {
      return this.dao.send(args);
    }
  };

  p.patch = function(args) {
    return new $.Deferred().resolve();
  };

  p.delete = function(args) {
    return new $.Deferred().resolve();
  };

  return MailService;
})();

module.exports = MailService;
