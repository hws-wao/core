'use strict';


var path = require('path'),
  mime = require('mime');

// 利用するクラス（コンストラクタ）の定義
var FileDao = require('../dao/file_dao');
var MIME_HTML = 'text/html';

var ResponseBuilder = (function() {

  var ResponseBuilder = function(args) {
    this.app = args.app;
    this.request = args.request;
    this.response = args.response;
    this.fileDao = new FileDao({
      baseDir: this.app.baseDir + '/templates'
    });
  };

  var p = ResponseBuilder.prototype;

  /**
   * テンプレートファイルの読み込み
   * @param {string} path テンプレートファイルの相対パス
   * @param {date} mtime テンプレートファイルの更新日時
   */
  p.load = function(filepath, mtime, reqid) {
    var d = $.Deferred();
    var that = this;
    var template;
    try {
      template = that.fileDao.stat({
        path: filepath
      });
      template.status = 200;
    } catch (e) {
      var ext = path.extname(filepath);
      template = {
        path: filepath,
        ext: ext,
        mimeType: mime.lookup(ext),
        status: 404
      };
    }
    // HTMLファイルの場合でかつ、テンプレートファイルが更新されている場合
    if (template.mimeType === MIME_HTML &&
      (template.mtime > mtime || mtime === undefined) &&
      template.status !== 404) {
      that.app.logger.info('[' + reqid + ']  load template - Start');
      var html = that.fileDao.read({
        path: filepath
      });
      // テンプレート用jQueryオブジェクトを作成
      jqueryify(html, that.app.getAppId(), JQUERY_URL, function($$) {
        template.jqueryObj = $$;
        // このテンプレートに必要な結果オブジェクトのリストを作成
        template.paramList = that.getParamList(template.jqueryObj);
        that.app.logger.info('[' + reqid + ']  load template - End');
        d.resolve(template);
      });
    } else {
      d.resolve(template);
    }
    return d.promise();
  };

  /**
   *
   */
  p.getParamList = function($template) {
    $template = $template; // jshint対策
    return {};
  };

  /**
   *
   */
  p.build = function(template, result) {
    this.app.logger.info('[' + result.reqid + ']  response - Start');
    var status = template.status;
    if (template.mimeType === MIME_HTML && template.status === 200) {
      var buildParam = {
        'bindData': {
          '_DB': result._DB,
          '_FILE': result._FILE,
          '_MAIL': result._MAIL,
          '_COOKIE': result._COOKIE,
          '_SES': result._SES
        }
      };
      var builtHtml = this.buildHtml(template.jqueryObj, buildParam);
      this.responseText({
        status: status,
        body: builtHtml,
        mimeType: template.mimeType
      });
    } else if (template.mimeType.substr(0, 4) === 'text' ||
      template.mimeType === 'application/javascript') {
      this.responseText({
        status: status,
        body: (status === 404) ? '' : this.fileDao.read({
          path: template.path
        }),
        mimeType: template.mimeType
      });
    } else {
      this.responseBinary({
        status: status,
        size: template.size,
        path: template.path,
        mtime: template.mtime,
        mimeType: template.mimeType
      });
    }
    this.app.logger.info('[' + result.reqid + ']  response - End StatusCode ' + status);
  };

  /**
   *
   */
  p.buildHtml = function($, buildParam) {
    var responseBody;
    var $html = $('html').clone();
    if ($.data($('html')[0], 'userdefine')) {
      buildParam.bindData._USR = $.data($('html')[0], 'userdefine');
    }
    $html.wao_bind(buildParam);

    $html.find('script.jsdom').remove();
    $html.find('[data-wao=keep]').attr('data-wao', null);
    if ($html.find('meta[http-equiv=refresh]').length > 0) {
      /*
      status = 303;
      var basepath = this.request.url.match(/^(.*\/)[^\/]+\.html$/)[1];
      var contextMatch = ($html.find('meta[http-equiv=refresh]').attr('content') + '').match(/^[0-9]+;[ ]+URL=(.*)$/);
      redirectUrl = 'http://' + this.request.headers.host + basepath + contextMatch[1]; // TODO：プロトコルが固定・・・
      */
      // TODO kimura
    } else {
      // FIXME html5しか対応しない方針
      responseBody = '<!DOCTYPE html>\n' + $html[0].outerHTML;
    }
    return responseBody;
  };

  /**
   *
   */
  p.responseText = function(args) {
    this.response.statusCode = args.status;
    switch (args.status) {
      case 200:
        this.response.statusMessage = 'OK';
        this.response.setHeader('Content-Type', args.mimeType + ';charset=utf-8');
        this.response.setHeader('Content-Length', Buffer.byteLength(args.body, 'utf8'));
        this.response.end(args.body);
        break;
      case 303:
        this.response.writeHead(status, {
          'Location': 'redirectUrl' // TODO kimura
        });
        this.response.end();
        break;
      case 404:
        this.response.statusMessage = 'Not Found';
        var body = '404 Not Found';
        this.response.setHeader('Content-Type', 'text/plain;charset=utf-8');
        this.response.setHeader('Content-Length', Buffer.byteLength(body, 'utf8'));
        this.response.end(body);
        break;
    }
  };

  p.responseBinary = function(args) {
    if (args.status === 404) {
      this.responseText(args);
    } else {
      var etag = args.size + ' ' + args.mtime;
      if (etag === this.request.headers['if-none-match']) {
        this.response.statusCode = 304;
        this.response.statusMessage = 'Not Modified';
        this.response.end();
      } else {
        var that = this;
        var expire = new Date();
        expire.setYear(expire.getYear() + 1901);
        that.response.writeHead(200, {
          'Content-Type': args.mimeType,
          'Content-Length': args.size,
          'Expires': expire.toString(),
          'Cache-Control': 'max-age=86400',
          'ETag': etag
        });
        var rStream = that.fileDao.createReadStream(args);
        rStream.pipe(that.response);
      }
    }
  };

  return ResponseBuilder;
})();

module.exports = ResponseBuilder;