/**
 * @file HTTPレスポンス処理クラス。
 *
 * @author kimuramanabu
 * @version 2.2.0
 *
 * @module hws-wao/lib/response/builder.js
 */
'use strict';

// 外部モジュール読み込み
/** npm path : ファイル名から拡張子を取得する */
var path = require('path');
/** npm mime : 拡張子からMIMEタイプを返却する */
var mime = require('mime');

// 内部モジュール読み込み
/** ファイルI/O用データアクセスオブジェクト（コンストラクタ） */
var FileDao = require('../dao/file_dao');

// 定数定義
/**
 * HTMLのMIMEタイプ文字列
 * @constant {string}
 */
var MIME_HTML = 'text/html';

/**
 * @class ResponseBuilder<br>
 * HTTPレスポンスの処理を行うクラス。
 *
 * @param {object} args パラメタ群
 * @param {App} args.app WAOアプリケーションオブジェクト
 * @param {request} args.request HTTPリクエストオブジェクト
 * @param {response} args.response HTTPレスポンスオブジェクト
 */
var ResponseBuilder = (function() {
  var ResponseBuilder = function(args) {
    this.app = args.app;
    this.request = args.request;
    this.response = args.response;
    this.fileDao = new FileDao({
      baseDir: this.app.baseDir + '/templates'
    });
  };

  /**
   * テンプレートとなるHTMLファイルを読み込み、<br>
   * jquerifyしてメモリに格納する。<br>
   * ファイルのタイムスタンプから前回load時から更新があったか判断する。<br>
   * 指定パスのファイルが見つからなかった場合は404情報を返却する。
   *
   * @param {string} filepath 読み込むファイルのパス
   * @param {Date} mtime 前回load時の更新日付
   * @param {string} reqid HTTPリクエスト識別子
   * @return {promise} 同期オブジェクト
   */
  ResponseBuilder.prototype.load = function(filepath, mtime, reqid) {
    var d = $.Deferred();
    var that = this;
    var template;
    // ファイルの属性情報を取得する
    try {
      template = that.fileDao.stat({
        path: filepath
      });
      template.status = 200;
    } catch (e) {
      // ファイルが見つからなかった場合
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
      // ファイルの内容をメモリ上に展開する
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
        d.resolve(template); // 読み込み完了
      });
    } else {
      d.resolve(template);
    }
    return d.promise();
  };

  /**
   * 未実装のメソッド
   */
  ResponseBuilder.prototype.getParamList = function($template) {
    $template = $template; // jshint対策
    return {};
  };

  /**
   * HTTPレスポンスの組み立てと送出を行う。
   *
   * @param {object} template テンプレート
   * @param {string} template.mimeType MIMEタイプ
   * @param {int} template.status HTTPステータス
   * @param {object} template.jqueryObj バインド前jQueryオブジェクト
   * @param {string} template.path テンプレートファイルのアプリケーション内パス
   * @param {int} template.size ファイルサイズ（htmlの場合は不要）
   * @param {Date} template.mtime テンプレートファイルの更新日（htmlの場合は不要）
   * @param {object} result
   * @param {string} result.reqid リクエストID
   * @param {object} result._DB DBからの情報取得結果
   */
  ResponseBuilder.prototype.build = function(template, result) {
    this.app.logger.info('[' + result.reqid + ']  response - Start');
    var status = template.status;
    if (template.mimeType === MIME_HTML && template.status === 200) {
      // パターン(1)：htmlファイルをwao-bindして返却
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
        status: builtHtml.status,
        body: builtHtml.responseBody,
        mimeType: template.mimeType,
        redirect: builtHtml.redirect,
        cookie: result._COOKIE
      });
    } else if (template.mimeType.substr(0, 4) === 'text' ||
      template.mimeType === 'application/javascript') {
      // パターン(2)：テキストファイルの返却
      this.responseText({
        status: status,
        body: (status === 404) ? '' : this.fileDao.read({
          path: template.path
        }),
        mimeType: template.mimeType,
        redirect: template.redirect,
        cookie: result._COOKIE
      });
    } else if (template.mimeType === 'application/json') {
      // パターン(3)：jsonの返却
      // TODO:aoyagi とりあえず200固定
      // buildJSONつくる
      // template.statusが403ならbodyは空
      // templateから、_DBなのか_FILEなのか判定し、データが取れてなければ404
      this.responseText({
        status: 200,
        body: JSON.stringify(result._DB),
        mimeType: template.mimeType
      });
    } else {
      // パターン(3)：バイナリデータの返却
      this.responseBinary({
        status: status,
        size: template.size,
        path: template.path,
        mtime: template.mtime,
        mimeType: template.mimeType,
        cookie: result._COOKIE
      });
    }
    this.app.logger.info('[' + result.reqid + ']  response - End StatusCode ' + status);
  };

  /**
   * 収集したデータとHTMLテンプレートを結びつけて<br>
   * HTTPレスポンスするHTMLテキストを生成する。
   *
   * @param {object} $ テンプレートとなるjQueryオブジェクト
   * @param {object} buildParam バインドするデータ
   * @return {string} HTML（文字列）
   */
  ResponseBuilder.prototype.buildHtml = function($, buildParam) {
    var res = {
      responseBody: '',
      status: 200,
      redirect: ''
    };
    var $html = $('html').clone();
    if ($.data($('html')[0], 'userdefine')) {
      buildParam.bindData._USR = $.data($('html')[0], 'userdefine');
    }
    $html.wao_bind(buildParam);

    $html.find('script.jsdom').remove();
    $html.find('[data-wao=keep]').attr('data-wao', null);
    if ($html.find('meta[http-equiv=refresh]').length > 0) {
      // リダイレクトが指定されている場合
      res.status = 303;
      var basepath = this.request.url.match(/^(.*\/)[^\/]+\.html$/)[1];
      var contextMatch = ($html.find('meta[http-equiv=refresh]').attr('content') + '').match(/^[0-9]+;[ ]+URL=(.*)$/);
      res.redirect = basepath + contextMatch[1]; // FIXME kimura 相対パスはRFC違反
    } else {
      // jQueryで作成したhtml(DOM)を文字列に変換
      // FIXME html5しか対応しない方針
      res.responseBody = '<!DOCTYPE html>\n' + $html[0].outerHTML;
      // TODO Cookieはどうすんだ？
    }
    return res;
  };

  /**
   * 文字列型レスポンスの送出処理を行う。
   *
   * @param {object} args パラメタ群
   * @param {int} args.status 返却するHTTPステータス
   * @param {string} args.mimeType 返却するコンテンツのMIMEタイプ
   * @param {string} args.body レスポンス本体（文字列）
   * @param {string} args.redirect リダイレクトURL（絶対パス）
   * @param {string} args.cookie クッキー（CookieDaoの処理結果）
   */
  ResponseBuilder.prototype.responseText = function(args) {
    switch (args.status) {
      case 200:
        this.responseText200(args);
        break;
      case 303:
        // POSTはGETにリダイレクト
        this.response.writeHead(args.status, {
          'Location': args.redirect
        });
        this.response.end();
        break;
      case 404:
        this.response.statusCode = args.status;
        this.response.statusMessage = 'Not Found';
        var body = '404 Not Found';
        this.response.setHeader('Content-Type', 'text/plain;charset=utf-8');
        this.response.setHeader('Content-Length', Buffer.byteLength(body, 'utf8'));
        this.response.end(body);
        break;
    }
  };

  /**
   * 文字列型レスポンスのHTTPステータス200送出処理を行う。
   *
   * @param {object} args パラメタ群（responseTextメソッドを参照）
   * @see #responseText
   */
  ResponseBuilder.prototype.responseText200 = function(args) {
    // HTTPヘッダ（基本情報）の出力
    this.response.statusCode = args.status;
    this.response.statusMessage = 'OK';
    this.response.setHeader('Content-Type', args.mimeType + ';charset=utf-8');
    this.response.setHeader('Content-Length', Buffer.byteLength(args.body, 'utf8'));
    // cookieの出力
    if (args.cookie && args.cookie._header && args.cookie._header['Set-Cookie']) {
      var cookies = args.cookie._header['Set-Cookie'];
      for (var i = 0; i < cookies.length; i++) {
        this.response.setHeader('Set-Cookie', cookies[i]);
      }
    }
    // テキストのbody部を出力
    this.response.end(args.body);
  };

  /**
   * バイナリデータのHTTPレスポンスを送出する。<br>
   * ETagを判定して更新がなければ304を返却する。
   *
   * @param {object} args パラメタ群
   * @param {int} args.size ファイルサイズ（HTTPヘッダに使用）
   * @param {Date} args.mtime ファイル更新日（HTTPヘッダに使用）
   * @param {string} args.mimeType MIMEタイプ
   */
  ResponseBuilder.prototype.responseBinary = function(args) {
    // ファイルが見つからなければ404レスポンス
    if (args.status === 404) {
      this.responseText(args);
    } else {
      var etag = args.size + ' ' + args.mtime;
      if (etag === this.request.headers['if-none-match']) {
        // 更新がなければ304レスポンス
        this.response.statusCode = 304;
        this.response.statusMessage = 'Not Modified';
        this.response.end();
      } else {
        // バイナリをレスポンス（200）
        var expire = new Date();
        expire.setYear(expire.getYear() + 1901);
        this.response.statusMessage = 'OK';
        this.response.setHeader('Content-Type', args.mimeType);
        this.response.setHeader('Content-Length', args.size);
        this.response.setHeader('Expires', expire.toString());
        this.response.setHeader('Cache-Control', 'max-age=86400'); // TODO kimura これでOK？
        this.response.setHeader('ETag', etag);
        var rStream = this.fileDao.createReadStream(args);
        rStream.pipe(this.response);
      }
    }
  };

  /**
   * レスポンス対象の画面に付与されたアクセス権限を取得する<br>
   * アクセス権限が指定されていない、または、チェックが不要な場合は、nullを返却する
   *
   * @param {object} template テンプレート
   * @param {string} template.mimeType MIMEタイプ
   * @param {int} template.status HTTPステータス
   * @param {object} template.jqueryObj バインド前jQueryオブジェクト
   * @param {string} template.path テンプレートファイルのアプリケーション内パス
   * @param {int} template.size ファイルサイズ（htmlの場合は不要）
   * @param {Date} template.mtime テンプレートファイルの更新日（htmlの場合は不要）
   * @returns {string} null:権限チェック不要/_LOGIN:ログイン済みユーザのみアクセス可/_LOGIN以外:アクセスを許可するグループ名
   */
  ResponseBuilder.prototype.getAuth = function(template) {
    // GETリクエストのみ権限チェックする
    if (this.request.method !== 'GET') {
      return null;
    }

    var $$ = template.jqueryObj;
    var $$html = $$('html').clone();

    // data-wao-auth属性の指定有無をチェックする
    var auth = $$html.find('meta[name="data-wao-auth"]').attr('content');

    // data-wao-auth属性が指定されていない場合、権限チェックしない
    if (!auth) {
      return null;
    }
    return auth;
  }

  /**
   * 当該画面へのアクセス権限が付与されているかチェックする
   *
   * @param {object} session セッションオブジェクト
   * @param {string} _LOGIN:ログイン済みユーザのみアクセス可/_LOGIN以外:アクセスを許可するグループ名
   * @returns {Promise} Promise
   */
  ResponseBuilder.prototype.authCheck = function(session, auth) {
    var d = $.Deferred();

    // data-wao-auth属性が指定されている場合
    // セッションのログイン情報をチェックする
    if (!session) {
      // セッションが存在しない場合、権限チェックエラーとする
      d.reject(new AppError(403, null, {
        message: 'セッションが存在しません'
      }));
      return;
    }

    if (auth === '_LOGIN') {
      // '_LOGIN'が指定されていた場合、login_idの有無をチェックする
      // TODO:セッションKEY、ログイン画面URLは、CONFIGで設定した値を参照する
      if (session['auth_login_id']) {
        // セッションに'auth_login_id'が存在していれば、ログイン済みと判断する
        d.resolve();
      } else {
        // セッションに'auth_login_id'が存在しない場合、権限チェックエラーとする
        // TODO:当初アクセスしたURLを保持しておいて、ログイン後にリダイレクト
        // TODO：なければ、ログイン画面にリダイレクトする
        d.reject(new AppError(403, null, {
          message: 'ログインしていません reqid=' + reqid
        }));
      }
    } else {
      // '_LOGIN'以外が指定されていた場合、group名が指定されたと判断する
      // セッションの'auth_login_group'に指定されたgroupが含まれているかチェックする
      if (session['auth_login_group']) {
        var loginGroup = session['auth_login_group'];
        if (Array.isArray(loginGroup)) {
          // グループが複数の場合
          if ($.inArray(auth, loginGroup) >= 0) {
            d.resolve();
          } else {
            d.reject(new AppError(403, null, {
              message: 'アクセス権がありません reqid=' + reqid
            }));
          }
        } else {
          if (auth === loginGroup) {
            d.resolve();
          } else {
            d.reject(new AppError(403, null, {
              message: 'アクセス権がありません reqid=' + reqid
            }));
          }
        }
      } else {
        // セッションに'auth_login_group'が存在しない場合、権限チェックエラーとする
        // TODO:当初アクセスしたURLを保持しておいて、ログイン後にリダイレクト
        // TODO：なければ、ログイン画面にリダイレクトする
        d.reject(new AppError(403, null, {
          message: 'ログインしていないかグループが指定されていません reqid=' + reqid
        }));
      }
    }
    return d.promise();
  };

  return ResponseBuilder;
})();

module.exports = ResponseBuilder;
