'use strict';

// 利用するnode_modulesの定義
var util = require('util');
// 利用するクラス（コンストラクタ）の定義
var DbService = require('./db_service'),
  CookieService = require('./cookie_service'),
  MailService = require('./mail_service'),
  FileService = require('./file_service');

/**
 * アプリケーションクラス
 */
var ServiceManager = (function() {

  /**
   * コンストラクタ
   */
  var ServiceManager = function(app) {
    this.services = {
      _DB: new DbService(app),
      _COOKIE: new CookieService(app),
      _MAIL: new MailService(app),
      _FILE: new FileService(app)
    };
    this.app = app;
  };

  /** メソッド定義用 */
  var p = ServiceManager.prototype;

  /**
   *
   */
  p.exec = function(params, meta) {
    var d = $.Deferred();
    var ret = {};
    var myPromises = [];
    var method = params._method;
    var that = this;
    delete params._method;
    var props = Object.keys(params);
    var callback = function(result) {
      that.app.logger.info('  Return Service:' + util.inspect(result));
      ret = $.extend(ret, result);
    };
    for (var idx in props) {
      var key = props[idx];
      var myPromise = this.services[key][method](key, params[key], meta);
      myPromise
        .done(callback)
        .fail(function() {});
      myPromises.push(myPromise);
    }
    $.when.apply(null, myPromises).then(function() {
      that.app.logger.info('  End Service:' + util.inspect(ret));
      d.resolve(ret);
    });
    return d.promise();
  };

  return ServiceManager;
})();

module.exports = ServiceManager;
