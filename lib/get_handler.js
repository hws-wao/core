var url         = require('url'),
    path        = require('path'),
    fs          = require('fs'),
    querystring = require('querystring');

var AppError = require('./app_error'),
    Result   = require('./result');

var GetHandler = (function() {

  var GetHandler = function(args) {
    this.app      = args.app;
    this.request  = args.request;
  };

  var p = GetHandler.prototype;

  p.handle = function() {
    that = this;
    return function(){
      var loadPath = that.getLoadFilePath(),
          result   = new Result(),
          d        = $.Deferred();

      var ext = path.extname(loadPath);
      result._FILE.ext = ext;

      // テンプレート読み込み、データ取得を並列で処理する
      if (that.isTemplateLoadRequest(loadPath)) {
        // テンプレート読み込み、データ取得を並列で処理する
        $.when(that.loadTemplate(loadPath, result), that.getData(result))
          .done(function(){d.resolve(result) })
          .fail(function(e){d.reject(e) });
      } else {
        var isBinary = ext === '.png' || ext === '.woff';
        (isBinary ? that.loadFile(loadPath, result) : that.loadText(loadPath, result))
          .done(function(){ d.resolve(result) })
          .fail(function(e){ d.reject(e) });
      }

      return d.promise();
    }
  };

  // 読み込むファイルがhtmlの場合、テンプレート読み込み処理だと判断してtrueを返す
  p.isTemplateLoadRequest = function(loadPath) {
    var ext = path.extname(loadPath).toLowerCase();
    return ext === '.html' || ext === '.htm';
  };

  p.getLoadFilePath = function() {
    var parseUrl      = url.parse(this.request.url, true),
        filepath      = parseUrl.pathname,
        dirPathRegExp = new RegExp('/$');

    if (dirPathRegExp.test(filepath)) {
      filepath += 'index.html';
    }

    return 'templates' + filepath;
  };

  p.loadText = function(loadPath, result) {
    var d = $.Deferred();
    if (!this.app.file.exists({ path: loadPath })) {
      d.reject(new AppError(404, null, { message: '指定されたファイルは見つかりませんでした。' }));
    } else {
      result._FILE.template = this.app.file.read({ path: loadPath });
       d.resolve(result);
    }
    return d.promise();
  };

  p.loadTemplate = function(loadPath, result) {
    var d = $.Deferred();

    try {
      if (!this.app.file.exists({ path: loadPath })) {
        d.reject(new AppError(404, null, { message: '指定されたファイルは見つかりませんでした。' }));
      } else {
        var jsdom = require('jsdom'),
          jquery = 'https://code.jquery.com/jquery-2.1.3.js',
          window = jsdom.jsdom(this.app.file.read({
            path: loadPath
          })).parentWindow;

        var that = this;

        // windowにjQueryを追加する
        (function() {
          var d = $.Deferred();
          jsdom.jQueryify(window, jquery, function(window, $) {

            // jqueryの.load()関数を上書き
            var jqueryLoadFuncOverride = function() {
              var _load = $.fn.load;
              $.fn.load = function(url, params, callback) {
                if (typeof url !== 'string' && _load) {
                  return _load.apply(this, arguments);
                }

                var selector, type, response,
                  self = this,
                  off = url.indexOf(' ');

                if (off > -1) {
                  selector = jQuery.trim(url.slice(off));
                  url = url.slice(0, off);
                }

                // If it's a function
                if ($.isFunction(params)) {

                  // We assume that it's the callback
                  callback = params;
                  params = undefined;

                  // Otherwise, build a param string
                } else if (params && typeof params === 'object') {
                  type = 'POST';
                }

                // If we have elements to modify, make the request
                if (self.length > 0) {
                  try {
                    var responseText = that.app.file.read({
                      path: url
                    });

                    // Save response for use in complete callback
                    response = arguments;

                    self.html(selector ?

                      // If a selector was specified, locate the right elements in a dummy div
                      // Exclude scripts to avoid IE 'Permission Denied' errors
                      jQuery('<div>').append(jQuery.parseHTML(responseText)).find(selector) :

                      // Otherwise use the full result
                      responseText);
                    self.each(callback, response);
                  } catch (e) {
                    self.each(callback, [e, status, null]);
                  }
                }
                return this;
              };
            };
            // jqueryの.load()を上書き
            jqueryLoadFuncOverride();
            // var aaa = that.app.file.read({
            //   path: './templates/_LOCAL/wao-include.js'
            // });
            // eval(aaa);

            // var node = window.document.doctype;
            // var html = ['<!DOCTYPE ',
            //   node.name, (node.publicId ? ' PUBLIC "' + node.publicId + '"' : ''), (!node.publicId && node.systemId ? ' SYSTEM' : ''), (node.systemId ? ' "' + node.systemId + '"' : ''),
            //   '>\n',
            //   window.document.documentElement.outerHTML
            // ].join('');


            result._FILE.template = $;
            d.resolve(result);
          });
          return d.promise();
        })().done(function() {
          d.resolve(result);
        });
      }
    } catch(e) {
      d.reject(e);
    }

    return d.promise();
  };

  p.getData = function(result) {
    var d = $.Deferred();
    var collectionName, prop;

    try {
      var findArgs = {};
      var query = url.parse(this.request.url, true).query;

      // GETパラメタをmongoDBの検索条件に指定できるJSON形式に変換
      for (var key in query) {
        if (key.match(/^([^.]+)\./)) {
          // ?collactionName.propertyName=xxxx
          collectionName = key.match(/^([^.]+)\./)[1]; // TODO：collectionの決定方法がアホ

          if (!findArgs[collectionName])　{
            findArgs[collectionName] = {};
            findArgs[collectionName]['colName'] = collectionName;
            findArgs[collectionName]['query'] = {};
          }

          // propertyNameを取得する
          prop = key.replace(collectionName + '.', '');

          // TODO:limit、offset、sortのI/F決めて対応する
          // TODO:ひとつのフィールドに複数条件ある場合にも対応する
          // TODO:eq以外のオペランド
          // TODO:or
          findArgs[collectionName]['query'][prop] = query[key];
        } else {
          // TODO:暫定対応
          // 本来は、collactionName=allの指定なしで全件取得できるようにする
          // GETパラメータを元にfindした結果、_DBに詰めたコレクション毎の情報に
          // data-wao-bindで指定したコレクションの情報がなかったら、条件なしで取得するようにする
          // ?collactionName=all
          // 検索条件なし
          collectionName = key;

          if (!findArgs[collectionName])　{
            findArgs[collectionName] = {};
            findArgs[collectionName]['colName'] = collectionName;
            findArgs[collectionName]['query'] = {};
          }
        }
      }

      var colCount = 0;
      var maxColCount = Object.keys(findArgs).length;
      console.log('findArgs Collection Count->' + maxColCount);

      if (maxColCount == 0) {
        return d.resolve();
      }

      for (var colName in findArgs) {
        console.log(colName + ' findArgs ->' + findArgs[colName]);
        (this.app.db.find(findArgs[colName]))()
          .done(function(colName, docs) {
            result._DB[colName] = docs;
            console.log("★★★★" + JSON.stringify(result._DB));
            colCount++;
            if (colCount == maxColCount) {
              d.resolve();
            }
          })
          .fail(function(e) {
            d.reject(new Error('e'));
          });
      }
    } catch(e) {
      d.reject(e);
    }

    return d.promise();
  };

  p.loadFile = function(loadPath, result) {
    var d = $.Deferred();
    result._FILE.binary = fs.readFileSync(this.app.file.makeAbsolutePath(loadPath));
    d.resolve();
    return d.promise();
  }

  return GetHandler;
})();

module.exports = GetHandler;
