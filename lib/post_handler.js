var multiparty  = require('multiparty'),
    path        = require('path'),
    querystring = require('querystring');

var GetHandler   = require('./get_handler'),
    Result       = require('./result');

// var FileUploader = require('./file_uploader');

var PostHandler = (function() {

  var PostHandler = function(args) {
    this.app      = args.app;
    this.request  = args.request;
  };

  var p = PostHandler.prototype;

  p.handle = function() {
    var d = $.Deferred(),
        result = new Result({ _FILE: {}, _DB: {} });

    // TODO:302リダイレクトを実装したら不要となるので、削除
    var getHandler = new GetHandler({ app: this.app, request: this.request });

    if (this.request.headers['content-type'].indexOf('multipart/form-data') >= 0) {
      // (new FileUploader({ app: this.app, request: this.request })).upload();
      var form = new multiparty.Form();
      var that = this;
      form.parse(this.request, function(err, fields, data) {

        // ファイルアップロード、データ登録を並列で処理する
        // TODO:302リダイレクトを実装したら、GETの処理は不要となるので、削除する想定
        // TODO:Fileアップロードだけでなくinsertも行う必要あり
//        $.when(that.fileUploade(that, data, result), that.postData(fields, result))
        $.when(that.fileUploade(that, data, result))
          .done(function(){d.resolve(result)})
          .fail(function(e){d.reject(e)});

      });
    } else {
      var that = this;
      var data = '';
      this.request.on('data', function(chunk) {
        data += chunk;
      });
      this.request.on('end', function() {
        that.postData(data, result)
        .done(function(){return getHandler.handle();})
        .done(function(){d.resolve(result)})
        .fail(function(e){d.reject(e)});
      });
    }

    return d.promise();
  };

  p.fileUploade = function (that, data, result){
    var d = $.Deferred();

    var filePath = Object.keys(data)[0];

    var mvFileList = [];
    for(var i = 0; i < data[filePath].length; i++) {
      mvFileList.push({ from: data[filePath][i]['path'], to: filePath })
    }

    that.app.file
      .mvFiles({ mvFileList: mvFileList })
      .done(function() {
        // TODO: 暫定実装。jsonが入ってることを知らせるためにtypeにjsonを入れる
        result._FILE.type = 'json';
        result._FILE.template = JSON.stringify({ code: 0 });
        d.resolve(result);
      })
      .fail(function() {
        d.reject(result);
      });

    return d.promise();
  }

  p.postData = function (data, result){
    var d = new $.Deferred;
    var that = this;
    var insertArgs = {};

    var collectionName;
    // POSTデータをJSON化
    var query = querystring.parse(data);

console.log('query:' + query);
    // JSON化したPOSTデータをmongoDBに入れられるJSON形式に変換
    for (var key in query) {
      if (key.indexOf('.') < 0) continue;
      collectionName = key.match(/^([^.]+)\./)[1]; // TODO：collectionの決定方法がアホ

      if (collectionName == '_APP') {
        // アプリ起動オプション
        switch (query[key]){
          case 'start()':
            var appProp = key.replace(collectionName + '.', '').split(':');
console.log('アプリ起動->' + appProp[0]  + ':' + appProp[1]);
            if (appProp[0] != 'undefined' && appProp[1] != 'undefined') {
              // TODO:既に起動済みのポートをどこかに保持しておかなくてはならない
//              if ($.inArray(appProp[1], listenPorts) < 0) {
                console.log(this.app);
//                _app.start();
//              }
            }
            break;
          default :
            break;
          return d.resolve();
        }
      }
      if (!insertArgs[collectionName]) {
        insertArgs[collectionName] = {};
        insertArgs[collectionName]['colName'] = collectionName;
        insertArgs[collectionName]['docs'] = {};
      }
      insertArgs[collectionName]['docs'][key.replace(collectionName + '.', '')] = query[key];
    }

    var colCount = 0;
    var maxColCount = Object.keys(insertArgs).length;
    console.log('insertArgs Collection Count->' + maxColCount);

    if (maxColCount == 0) {
      return d.resolve();
    }

    for (var colName in insertArgs) {
      console.log(insertArgs[colName]);
      (that.app.db.insert(insertArgs[colName]))()
        .done(function(colName, docs) {
          result._DB[colName] = docs;
          colCount++;
          if (colCount == maxColCount) {
            d.resolve();
          }
        })
        .fail(function(e) {
          d.reject(e);
        });
    }

    return d.promise();
  }

  return PostHandler;
})();

module.exports = PostHandler;