var RequestHandler = (function () {

  var RequestHandler = function(request, response) {
    this.request  = request;
    this.response = response;
    this.method   = request.method;
    this.url      = request.url;
    this.version  = request.httpVersion;
  };

  var p = RequestHandler.prototype;

  p.handle = function() {
    var now = new Date();
    console.log('Started ' + this.method + ' "' + this.url + '" for ' + now.toFormat('YYYY-MM-DD HH24:MI:SS'));

    try {
      switch(this.method) {
        case 'GET':  this.handleGet();  break;
        case 'POST': this.handlePost(); break;
      }
    } catch(e) {
      console.log('error');
      console.trace();
    }
  }

  p.handlePost = function() {
    if (this.request.headers['content-type'].indexOf('multipart/form-data') >= 0) {
      console.log('ファイルアップロード処理');
    } else {
      console.log('POSTの処理');
    }
  };

  p.handleGet = function() {
    console.log('GETの処理');
  };

  return RequestHandler;
})();


module.exports = function(request, response) {
  var requestHandler = new RequestHandler(request, response);
  try {
    requestHandler.handle();
    response.setHeader('Content-Type', 'text/html');
    response.statusCode = 200;
    response.end(
      '<form action="/" enctype="multipart/form-data" method="post">'+
      '<input type="text" name="title"><br>'+
      '<input type="file" name="upload" multiple="multiple"><br>'+
      '<input type="submit" value="Upload">'+
      '</form>'
    );
    console.log('Completed 200 OK');
  } catch(e) {
    response.statusCode = 500;
    response.end('ERROR');
    console.log('Completed 500 Internal Error');
    console.trace()
  }

};