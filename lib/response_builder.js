var mime = require('mime');

var ResponseBuilder = (function() {

  var ResponseBuilder = function(args) {
    this.app      = args.app;
    this.response = args.response;
  };

  var p = ResponseBuilder.prototype;

  p.build = function(result) {

    var mimeType = mime.lookup(result._FILE.ext);
    var status = 200;

    if (mimeType === 'text/html') {
      this.app.logger.info('[' + result.reqid + ']  response - Start');
      var $redirect = this.getMetaRefreshElements(result._FILE.template);
      if ($redirect.size() > 0) {
        status = 301;
        var contextMatch = ($redirect.attr('content') + '').match(/^[0-9]+;[ ]+URL=(.*)$/);
        if (contextMatch) {
          // TODO：URLの組み立てがすげー中途半端
          var basepath = request.url.match(/^(.*\/)[^\/]+\.html$/)[1];
          var target = contextMatch[1].replace('./',''); // TODO：これがヤバい
          var redirectUrl = basepath + this.bindGetParam(target, 0, false);
        }
      }
    }

    switch(status) {
      case 200:
        this.response.statusCode = 200;
        this.response.statusMessage = 'OK';

        // _FILE.typeがjsonだったら、jsonのヘッダをセットする暫定対応
        if (result._FILE.type === 'json') {
          this.response.setHeader('Content-Type', 'application/json; charset=utf-8');
        } else {
          this.response.setHeader('Content-Type', mimeType);
        }

        if (result._FILE.ext === '.png' || result._FILE.ext === '.woff') {
          this.response.end(result._FILE.binary, 'binary');
        } else if (mimeType !== 'text/html') {
          this.response.end(result.template);
        } else {

          var $ = result.template;
          var $html = $('html').clone();

          // TODO: 本当は↓こうやったら、ちゃんと_FILEにバインドしてほしいけど、
          // _DB._FILEに_FILEの内容を入れてバインドさせるという暫定対応
          var bindData = {
            'bindData' : {
              '_DB'   : result._DB,
              '_FILE' : result._FILE
            }
          };
          bindData.bindData._DB._FILE = result._FILE;
          $html.wao_bind(bindData);

          $html.find('script.jsdom').remove();
          $html.find('[data-wao=keep]').attr('data-wao', null);
          this.response.end('<html>\n' + $html.html() + '</html>');
          this.app.logger.info('[' + result.reqid + ']  response - End');
        }

        break;
      case 301:
        console.log("redirect");
        this.response.statusCode = 301;
        this.response.end();
        break;
    }
  };

  p.getMetaRefreshElements = function(html) {
    return $($.parseHTML(html)).find('meta[http-equiv=refresh]');
  }

  p.bindGetParam = function(target, index, isIterator) {
    // ?hoge=hoge&hoge=hoge....部分を抜き出す
    var getparam = target.match(/\?([^=]+=([^&]*)?&?)*/);
    var getparamR = '';
    if (getparam) { // URLにGETパラメタが含まれていれば
      getparamR = '?';
      getparam = getparam[0].replace(/^\?/,'').split('&'); // hoge=hogeに分割して配列化
      for (var i in getparam) {
        var paramName = getparam[i].split('=')[0];
        var paramValue = getparam[i].split('=')[1];
        // 既にbindされている場合は、対象外とする
        if (paramValue.trim() == '') {
          var trg = {
            collectionName: paramName.split('.')[0],
            propertyName: paramName.split('.')[1]
          };
          // data-wao-iteratorに指定されている場合、除外する
          // TODO:findDataがあることが前提になっている
          var val = '';
          if (!isIterator) {
            if (this.findData[trg.collectionName] && this.findData[trg.collectionName].length == 1) {
              val = this.getValue(trg.collectionName, trg.propertyName, index);
            }
            if (this.crudData.insert[trg.collectionName]) {
              val = this.getValue(trg.collectionName, trg.propertyName, index);
            }
          } else {
            val = this.getValue(trg.collectionName, trg.propertyName, index);
          }
          getparamR += paramName + '=' + val + '&';
        } else {
          getparamR += paramName + '=' + paramValue + '&';
        }
      }
      getparamR = getparamR.slice(0, -1);
    }
    return target.replace(/\?([^=]+=([^&]*)?&?)*/, '') + getparamR;
  };

  // 参照文字列から自動的に適切なオブジェクトを選択して、参照文字列に対応するデータを返却する
  p.getValue = function(col, prop, index) {
    // TODO：_DBとか_SESって修飾子がついていたら・・・的な処理が今後必要
    // TODO:（データが見つかりません）は、とりあえず表示しないようにする
    var val = '';
    var key = 'undefined';
    if (col == '_FILE') {
        key = '_FILE';
        val = JSON.stringify(this.findData[col]);
    } else {
      if (this.findData[col] && this.findData[col][index] && this.findData[col][index][prop]) {
        key = '_DB.' + col + '.' + prop;
        val = this.findData[col][index][prop];
      } else if (this.findData[col] && prop == 'length') {
        key = '_DB.' + col + '.' + prop;
        val = this.findData[col].length;
      } else if (this.crudData.insert[col] && this.crudData.insert[col][prop]) {
        key = '_DB.' + col + '.' + prop;
        val = this.crudData.insert[col][prop];
      }
    }
    console.log('getValue() : ' + key + '=' + val);
    return val;
  }

  return ResponseBuilder;
})();

module.exports = ResponseBuilder;
