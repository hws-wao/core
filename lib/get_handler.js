var url = require('url'),
    querystring = require('querystring'),
    $   = require('jquery-deferred');

var FileNotFoundError = require('./errors/file_not_found_error');

var GetHandler = (function() {

  var GetHandler = function(args) {
    this.app      = args.app;
    this.request  = args.request;
    this.response = args.response;
  };

  var p = GetHandler.prototype;

  p.handle = function() {
    var loadPath = this.getLoadFilePath(),
        result   = { _FILE: {}, _DB: {} },
        d        = $.Deferred();

    // テンプレート読み込み、データ取得を並列で処理する
    $.when(this.loadTemplate(loadPath, result), this.getData(result))
    .done(function(){d.resolve(result)})
    .fail(function(){d.reject(result)});

    return d.promise();
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

  p.loadTemplate = function(loadPath, result) {
    var d = $.Deferred();

    try {
      if (!this.app.file.exists({ path: loadPath })) {
        d.reject(new FileNotFoundError());
      } else {
        result._FILE.template = this.app.file.read({ path: loadPath })
        d.resolve(result);
      }
    } catch(e) {
      d.reject(e);
    }

    return d.promise();
  };

  p.getData = function(result) {
    var d = $.Deferred();

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
          if (!findArgs[collectionName]) findArgs[collectionName] = {};
        }
      }

      var colCount = 0;
      var maxColCount = Object.keys(findArgs).length;
      console.log('findArgs Collection Count->' + maxColCount);

      for (var colName in findArgs) {
        console.log(colName + ' findArgs ->' + findArgs[colName]);
        (this.app.db.find(findArgs[colName]))()
        .done(function(docs) {
          result._DB.push(docs);
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

  return GetHandler;
})();

module.exports = GetHandler;
