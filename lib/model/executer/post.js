var is          = require('type-is'),
    multiparty  = require('multiparty'),
    querystring = require('wao-querystring'),
    undefined;

var GetHandler   = require('./get'),
    Result       = require('../../dto/result'),
    FileUpload = require('./file_upload');

var PostHandler = (function() {

  var PostHandler = function(args) {
    this.app       = args.app;
    this.request   = args.request;
    this.reqParams = args.requestParams;
  };

  var p = PostHandler.prototype;

  p.handle = function() {
    var that = this;

    return function(){
      var d = $.Deferred(),
          result = new Result({ _FILE: {}, _DB: {} });

      // TODO:302リダイレクトを実装したら不要となるので、削除
      var getHandler = new GetHandler({ app: that.app, request: that.request });

      $.when(
        (new FileUpload(that.app, that.reqParams)).execute(),
        that.postData(that.reqParams._DB, result)
      )
      .then(getHandler.handle(result))
      .done(function(result) {
        d.resolve(result);
      });

      return d.promise();
    };
  };

  p.postData = function (data, result){
    var d = new $.Deferred();
    var that = this;
    var insertArgs = {};
    var updateArgs = {};

    var collectionName;
    // POSTデータをJSON化
    var query = querystring.parse(data);

    // JSON化したPOSTデータをmongoDBに入れられるJSON形式に変換
    var props = Object.keys(query);
    for (var idx in props) {
      collectionName = props[idx];
      if (collectionName === '_APP') {
        // アプリ起動オプション
        var _APP = query[collectionName];
        var appProps = Object.keys(_APP);
        switch (_APP[appProps[0]]){
          case 'start()':
            var appProp = appProps[0].split(':');
            if (appProp[0] !== 'undefined' && appProp[1] !== 'undefined') {
              var baseDir = './apps/' + this.app.name + '_' + this.app.port + '/apps/' + appProp[0] + '_' + appProp[1];
              this.app.wao.createAndStartApp({ name: appProp[0] , port: appProp[1] * 1, baseDir: baseDir });
            }
            break;
          default :
            break;
        }
        return d.resolve();
      }

      // idパラメータの有無でinsert or updateを判断する
      var id = query[collectionName]['id'];
      delete query[collectionName]['id'];

      if (id == undefined) {
        if (!insertArgs[collectionName]) {
          insertArgs[collectionName] = {
            "docs": query[collectionName],
            "colName": collectionName
          };
        }
      } else {
        if (!updateArgs[collectionName]) {
          // TODO:今は更新条件はid固定。カラム、オペランドを指定できるようにする
          updateArgs[collectionName] = {
            "doc": {$push:query[collectionName]},
            "selector": {"id": id},
            "colName": collectionName
          };
        }
      }
    }

    var colCount = 0;
    var maxColCount = 0;
    if (id == undefined) {
      maxColCount = Object.keys(insertArgs).length;
      console.log('insertArgs Collection Count->' + maxColCount);
      if (maxColCount === 0) {
        return d.resolve();
      }
      for (var colName in insertArgs) {
        console.log(insertArgs[colName]);
        (that.app.db.insert(insertArgs[colName]))()
          .done(function(colName, docs) {
            result._DB[colName] = docs;
            colCount++;
            if (colCount === maxColCount) {
              d.resolve();
            }
          })
          .fail(function(e) {
            d.reject(e);
          });
      }
    } else {
      maxColCount = Object.keys(updateArgs).length;
      console.log('updateArgs Collection Count->' + maxColCount);
      if (maxColCount === 0) {
        return d.resolve();
      }
      for (var colName in updateArgs) {
        console.log(updateArgs[colName]);
        (that.app.db.update(updateArgs[colName]))()
          .done(function(colName, docs) {
            // TODO:updateは何も返してない
            //result._DB[colName] = docs;
            colCount++;
            if (colCount === maxColCount) {
              d.resolve();
            }
          })
          .fail(function(e) {
            d.reject(e);
          });
      }
    }

    return d.promise();
  };

  return PostHandler;
})();

module.exports = PostHandler;