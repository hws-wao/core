'use strict';


var path = require('path'),
  mime = require('mime');

// 利用するクラス（コンストラクタ）の定義
var FileDao = require('../dao/file_dao');
var MIME_HTML = 'text/html';

var ResponseBuilder = (function() {

  var ResponseBuilder = function(args) {
    this.app = args.app;
    //this.request = args.request;
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
  p.load = function(filepath, mtime) {
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
    if (template.mimeType === MIME_HTML && (template.mtime > mtime || mtime === undefined)) {
      that.app.logger.info('    template load - Start');
      var html = that.fileDao.read({
        path: filepath
      });
      // テンプレート用jQueryオブジェクトを作成
      jqueryify(html, that.app.getAppId(), JQUERY_URL, function($$) {
        template.jqueryObj = $$;
        // このテンプレートに必要な結果オブジェクトのリストを作成
        template.paramList = that.getParamList(template.jqueryObj);
        d.resolve(template);
        that.app.logger.info('    template load - End');
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
    if (template.mimeType === MIME_HTML) {
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
      this.responseHtml({
        status: 200,
        body: builtHtml,
        mimeType: template.mimeType
      });
    } else if (template.mimeType === 'text/css' || template.mimeType === 'text/javascript') {
      this.responseText({
        status: 200,
        path: template.path,
        mimeType: template.mimeType,
        size: template.size
      });
    }
    this.app.logger.info('[' + result.reqid + ']  response - End StatusCode 200');
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
  p.responseHtml = function(args) {
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
    }
  };

  p.responseText = function(args) {
    var body = this.fileDao.read({
      path: args.path
    });
    this.response.statusCode = args.status;
    this.response.statusMessage = 'OK';
    this.response.setHeader('Content-Type', args.mimeType + ';charset=utf-8');
    this.response.setHeader('Content-Length', Buffer.byteLength(body, 'utf8'));
    this.response.end(body);
  };

  return ResponseBuilder;
})();

module.exports = ResponseBuilder;