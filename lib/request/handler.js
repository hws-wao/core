'use strict';

// 利用するnode_modulesの定義
var url = require('url'),
  typeIs = require('type-is'),
  querystring = require('wao-querystring'),
  Puid = require('puid'),
  multiparty = require('multiparty'),
  utils = require('../utils/utils');

// 利用するクラス（コンストラクタ）の定義
var AppError = require('../dto/app_error');

/**
 * リクエスト解析処理
 * @class
 */
var RequestHandler = (function() {

  /**
   * コンストラクタ
   * @constructor
   */
  var RequestHandler = function(args) {
    this.app = args.app;
    this.request = args.app.request;
    this.reqid = undefined;
    this.puid = new Puid('wao-request-handler');
    this.qOptions = {
      defaultPrefix: '_DB'
    };
  };

  /** メソッド定義用 */
  var p = RequestHandler.prototype;

  /**
   * リクエスト解析処理
   * @returns {Promise} Promise
   */
  p.handle = function() {
    var d = $.Deferred();
    var ret = {
      _method: this.request.method.toLowerCase()
    };
    this.reqStart();

    // GETリクエストの場合はクエリストリングを解析する
    if (this.request.method === 'GET') {
      ret = $.extend(ret, parseRequestUrl(this.request, this.qOptions));
      d.resolve(ret);
      return d.promise();
    } else
    // POSTリクエストなどGET以外の場合はフォームデータを解析する
    {
      var type = typeIs(this.request, ['urlencoded', 'json', 'multipart']);
      switch (type) {
        case 'multipart':
          parseMultipartBody(this.request, this.qOptions)
            .done(function(result) {
              ret = $.extend(ret, result);
              d.resolve(ret);
            })
            .fail(function(err) {
              // TODO y.arai このコードは動作未確認
              d.reject(new AppError(500, err, {}));
            });
          break;
        case 'urlencoded':
          parseUrlEncodeBody(this.request, this.qOptions)
            .done(function(result) {
              ret = $.extend(ret, result);
              d.resolve(ret);
            })
            .fail(function(err) {
              // TODO kimura このコードは動作未確認
              d.reject(new AppError(500, err, {}));
            });
          break;
      }
    }
    return d.promise();
  };

  p.reqStart = function() {
    this.reqid = this.puid.generate();
    // infoログ：HTTPリクエスト解析処理を開始
    var logmsg = '';
    logmsg += '[' + this.reqid + '] Started ' + this.request.method;
    logmsg += ' "' + this.request.url + '"';
    this.app.logger.info(logmsg);
  };

  /**
   * GETパラメタ（クエリストリング）の解析処理
   * @param {request} HTTPリクエストオブジェクト
   * @param {object} 解析処理用オプション
   * @returns {object} WAOアプリ用リクエストセット
   */
  function parseRequestUrl(request, options) {
    var parsedUrl = url.parse(request.url, true);
    var params = {};
    if (parsedUrl.search !== '') {
      params = querystring.parse(parsedUrl.search.replace(/^\?/, ''), '&', '=', options);
    }
    return params;
  }

  /**
   * POSTデータ（フォーム）の解析処理
   * @param {request} HTTPリクエストオブジェクト
   * @param {object} 解析処理用オプション
   * @returns {Promise} Promise
   */
  function parseUrlEncodeBody(request, options) {
    var d = $.Deferred();
    var data = '';
    request.on('data', function(chunk) {
      data += chunk;
    });
    request.on('end', function() {
      d.resolve(querystring.parse(data, '&', '=', options));
    });
    return d.promise();
  }

  /**
   * POSTデータ（multipart）の解析処理
   * @param {request} request - HTTPリクエストオブジェクト
   * @param {object} options - 解析処理用オプション
   * @param {string} options.defaultPrefix - リクエストパラメータに_XXXプリフィックスがない場合
   *   デフォルトで設定するプリフィクス
   * @returns {Promise} Promise
   */
  function parseMultipartBody(request, options) {
    var d = $.Deferred();
    var form = new multiparty.Form();
    form.parse(request, function(err, fields, files) {
      var parsedParams = {};

      Object.keys(files).forEach(function(fileUploadPath) {
        var res = querystring.parse(fileUploadPath, '&', '=', options);
        $.extend(true, parsedParams, utils.addValueBottomLayer(res, files[fileUploadPath][0]));
      });

      Object.keys(fields).forEach(function(paramName) {
        var res = querystring.parse(paramName, '&', '=', options);
        $.extend(true, parsedParams, utils.addValueBottomLayer(res, fields[paramName][0]));
      });

      d.resolve(parsedParams);
    });
    return d.promise();
  }

  return RequestHandler;
})();

module.exports = RequestHandler;
