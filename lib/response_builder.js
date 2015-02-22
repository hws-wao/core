var mime = require('mime');

var ResponseBuilder = (function() {

  var ResponseBuilder = function(args) {
    this.app      = args.app;
    this.request  = args.request;
    this.response = args.response;
  };

  var p = ResponseBuilder.prototype;

  p.build = function(result) {

    var mimeType = mime.lookup(result._FILE.ext);
    var status = 200;
    var responseBody = null;
    var resirectUrl = '';

    if (mimeType === 'text/html') {
      this.app.logger.info('[' + result.reqid + ']  response - Start');
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
      if ($.data($('html')[0], 'userdefine')) {
        bindData.bindData._USR = $.data($('html')[0], 'userdefine');
      }
      $html.wao_bind(bindData);

      $html.find('script.jsdom').remove();
      $html.find('[data-wao=keep]').attr('data-wao', null);
      if ($html.find('meta[http-equiv=refresh]').length > 0) {
        status = 303;
        var basepath = this.request.url.match(/^(.*\/)[^\/]+\.html$/)[1];
        var contextMatch = ($html.find('meta[http-equiv=refresh]').attr('content') + "").match(/^[0-9]+;[ ]+URL=(.*)$/);
        redirectUrl = 'http://' + this.request.headers.host + basepath + contextMatch[1]; // TODO：プロトコルが固定・・・
      } else {
        // FIXME html5しか対応しない方針
        responseBody = '<!DOCTYPE html>\n' + $html[0].outerHTML;
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
          this.response.end(responseBody);
          this.app.logger.info('[' + result.reqid + ']  response - End StatusCode ' + status);
        }

        break;
      case 303:
        this.response.writeHead(status, { 'Location': redirectUrl });
        this.response.end();
        this.app.logger.info('[' + result.reqid + ']  response - End StatusCode ' + status);
        break;
    }
  };




  return ResponseBuilder;
})();

module.exports = ResponseBuilder;
