var url = require('url'),
  path = require('path'),
  querystring = require('wao-querystring');

var Result = require('./result');

var GetHandler = (function() {

  var GetHandler = function(args) {
    this.app = args.app;
    this.reqid = args.reqid;
    this.request = args.request;
    this.parsedUrl = url.parse(this.request.url);
    this.parsedQuery = querystring.parse(this.parsedUrl.query);
    // TODO 暫定対応 POST後のリダイレクト実装後に消す
    this.postResult = args.postResult || null;
  };

  var p = GetHandler.prototype;

  p.handle = function() {
    var loadPath = this.getLoadFilePath(),
      result = new Result(),
      d = $.Deferred();

    // POSTの_DBを引き継ぐ
    if (this.postResult !== null) {
      result._DB = this.postResult._DB;
    }

    result._FILE.ext = path.extname(loadPath);

    $.when(
      this.loadTemplate(loadPath, result),
      this.getData(result)
    ).done(function() {
      d.resolve(result);
    }).fail(function(e) {
      d.reject(e);
    });

    return d.promise();
  };

  p.getLoadFilePath = function() {
    var parseUrl = url.parse(this.request.url, true),
      filepath = parseUrl.pathname,
      dirPathRegExp = new RegExp('/$');

    if (dirPathRegExp.test(filepath)) {
      filepath += 'index.html';
    }

    return 'templates' + filepath;
  };

  p.loadTemplate = function(loadPath, result) {
    this.app.logger.info(
      '[' + this.reqid + ']  loadTemplate - Start "' + loadPath + '"'
    );

    var d = $.Deferred();
    var that = this;

    this.loadTemplatePath().done(function(fileList) {
      result._FILE.path = JSON.stringify(fileList);
      try {

        if (that.app._HTML[loadPath]) {
          result.template = that.app._HTML[loadPath];
          that.app.logger.info(
            '[' + that.reqid + ']  loadTemplate - End "' + loadPath + '"'
          );

          d.resolve(result);
          return d.promise();
        }

        that.app.file.read({
          path: loadPath
        }).fail(function(e) {
          d.reject(e);
        }).done(function(html) {
          jqueryify(html, that.app.getAppId(), JQUERY_URL, function(
            $$) {
            that.app._HTML[loadPath] = $$;
            result.template = $$;
            that.app.logger.info(
              '[' + that.reqid + '] loadTemplate - End "' + loadPath +
              '"'
            );

            d.resolve(result);
          });
        });
      } catch (e) {
        console.log(e);
        d.reject(e);
      }
    });

    return d.promise();
  };

  p.loadTemplatePath = function() {
    var _d = $.Deferred();

    if (this.parsedQuery._FILE && 'path' in this.parsedQuery._FILE) {
      var queryPath = this.parsedQuery._FILE.path;
      var path = this.app.file.baseDir + '/apps' + queryPath + 'templates/';

      this.app.file.readDirRecursive(path, function(fileList) {
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

          if (!findArgs[collectionName]) {
            findArgs[collectionName] = {};
            findArgs[collectionName].colName = collectionName;
            findArgs[collectionName].query = {};
          }

          // propertyNameを取得する
          prop = key.replace(collectionName + '.', '');

          // TODO:limit、offset、sortのI/F決めて対応する
          // TODO:ひとつのフィールドに複数条件ある場合にも対応する
          // TODO:eq以外のオペランド
          // TODO:or
          findArgs[collectionName].query[prop] = query[key];
        } else {
          // TODO:暫定対応
          // 本来は、collactionName=allの指定なしで全件取得できるようにする
          // GETパラメータを元にfindした結果、_DBに詰めたコレクション毎の情報に
          // data-wao-bindで指定したコレクションの情報がなかったら、条件なしで取得するようにする
          // ?collactionName=all
          // 検索条件なし
          collectionName = key;

          if (!findArgs[collectionName]) {
            findArgs[collectionName] = {};
            findArgs[collectionName].colName = collectionName;
            findArgs[collectionName].query = {};
          }
        }
      }

      var colCount = 0;
      var maxColCount = Object.keys(findArgs).length;
      console.log('findArgs Collection Count->' + maxColCount);

      if (maxColCount === 0) {
        return d.resolve();
      }

      for (var colName in findArgs) {
        console.log(colName + ' findArgs ->' + findArgs[colName]);
        (this.app.db.find(findArgs[colName]))()
          .done(function(colName, docs) {
            result._DB[colName] = docs;
            console.log('★★★★' + JSON.stringify(result._DB));
            colCount++;
            if (colCount === maxColCount) {
              d.resolve();
            }
          })
          .fail(rejectCallback(d));
      }
    } catch (e) {
      d.reject(e);
    }

    return d.promise();
  };

  function rejectCallback(deferred) {
    return function(error) {
      deferred.reject(new Error(error));
    };
  }

  return GetHandler;
})();

module.exports = GetHandler;