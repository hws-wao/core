var url         = require('url'),
    path        = require('path'),
    fs          = require('fs'),
    querystring = require('wao-querystring'),
    undefined;

var AppError = require('../../dto/app_error'),
    Result   = require('../../dto/result');

var GetHandler = (function() {

  var GetHandler = function(args) {
    this.app         = args.app;
    this.reqid       = args.reqid;
    this.request     = args.request;
    this.parsedUrl   = url.parse(this.request.url);
    this.parsedQuery = querystring.parse(this.parsedUrl.query);
  };

  var p = GetHandler.prototype;

  p.handle = function(args) {
    var that = this;
    var postResult = args;
    return function(){
      var loadPath = that.getLoadFilePath(),
          result   = new Result(),
          d        = $.Deferred();

      // POSTの_DBを引き継ぐ
      if (postResult != undefined) {
        result._DB = postResult._DB;
      }

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
      result.template = this.app.file.read({ path: loadPath });
      d.resolve(result);
    }
    return d.promise();
  };

  p.loadTemplate = function(loadPath, result) {
    this.app.logger.info('[' + this.reqid + ']  loadTemplate - Start "' + loadPath + '"');
    var d = $.Deferred();
    var that = this;

    this.loadTemplatePath().done(function(fileList) {
      result._FILE.path = JSON.stringify(fileList);
      try {

        if (that.app._HTML[loadPath]) {
          result.template = that.app._HTML[loadPath];
          that.app.logger.info('[' + that.reqid + ']  loadTemplate - End "' + loadPath + '"');
          d.resolve(result);
          return d.promise();
        }

        if (!that.app.file.exists({ path: loadPath })) {
          d.reject(new AppError(404, null, { message: '指定されたファイルは見つかりませんでした。' }));
        } else {
          var html = that.app.file.read({ path: loadPath });
          jqueryify(html, that.app.getAppId(), JQUERY_URL, function($$) {
            that.app._HTML[loadPath] = $$;
            result.template = $$;
            that.app.logger.info('[' + that.reqid + ']  loadTemplate - End "' + loadPath + '"');
            d.resolve(result);
          });
        }
      } catch(e) {
        console.log(e);
        d.reject(e);
      }
    });

    return d.promise();
  };

  p.loadTemplatePath = function() {
    var _d = $.Deferred();

    if (this.parsedQuery['_FILE'] && 'path' in this.parsedQuery['_FILE']) {
      this.app.file.readDirRecursive(this.app.file.baseDir + '/apps' + this.parsedQuery._FILE.path + 'templates/', function(fileList) {
        _d.resolve(fileList);
      });
    } else {
      _d.resolve();
    }

    return _d.promise();
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
