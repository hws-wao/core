'use strict';

// 利用するnode_modulesの定義
//var http = require('http');
// 利用するクラス（コンストラクタ）の定義
var DbService = require('./db_service'),
  CookieService = require('./cookie_service'),
  MailService = require('./mail_service');

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
      _MAIL: new MailService(app)
    };
  };

  /** メソッド定義用 */
  var p = ServiceManager.prototype;

  /**
   *
   */
  p.exec = function(params) {
    var d = $.Deferred();
    var ret = {};
    var myPromises = [];
    var method = params._method;
    delete params._method;
    var props = Object.keys(params);
    var callback = function(result) {
      ret = $.extend(ret, result);
    };
    for (var idx in props) {
      var key = props[idx];
      var value = params[key];
      var myPromise = this.services[key][method](key, value);
      myPromise
        .done(callback)
        .fail(function() {});
      myPromises.push(myPromise);
    }
    $.when(myPromises).then(function() {
      d.resolve(ret);
    });
    return d.promise();
  };

  return ServiceManager;
})();

module.exports = ServiceManager;
