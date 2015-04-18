'use strict'

var url    = require('url');
var Puid   = require('puid');
var is     = require('type-is');
var querystring = require('wao-querystring');
var multiparty = require('multiparty');

var GetHandler    = require('../model/executer/get'),
    PostHandler   = require('../model/executer/post'),
    DeleteHandler = require('../model/executer/delete'),
    PatchHandler  = require('../model/executer/patch');

var RequestHandler = (function () {

  var RequestHandler = function(args) {
    this.app      = args.app;
    this.request  = args.request;
    this.reqid    = undefined;
    this.puid     = new Puid('wao');
  };

  var p = RequestHandler.prototype;

  p.handle = function() {
    var that = this;
    var d = $.Deferred();
    this.reqid = this.puid.generate();

    var handler = null,
        handlerArgs = { app: this.app, request: this.request, reqid: this.reqid };

    this.app.logger.info('[' + this.reqid + '] Started ' + this.request.method + ' "' + this.request.url + '"');

    parseRequest(handlerArgs)
      .then(requestExecute)
      .done(function(result) { result.reqid = that.reqid; d.resolve(result); })
      .fail(function(result) { result.reqid = that.reqid; d.reject(result); });

    return d.promise();
  };

  function parseRequest(args) {
    var d = $.Deferred();
    var callback = function(params) {
      d.resolve(args, params);
    };

    if (args.request.method == 'GET') {
      parseRequestUrl(args, callback);
    } else {
      parseRequestBody(args, callback);
    }
    return d.promise();
  }

  function updateDbParams(params) {
    var newParams = { _FILE: {}, _DB: {} };
    var keys = Object.keys(params);
    for(var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (key == '_FILE' || key == '_DB') {
        newParams[key] = params[key];
      } else {
        newParams._DB[key] = params[key];
      }
    }
    return newParams;
  }

  function requestExecute(args, params) {
    var d = $.Deferred();

    (chooseExecuter(args, params).handle())()
      .done(function(result) { result.reqid = args.reqid; d.resolve(result); })
      .fail(function(result) { result.reqid = args.reqid; d.reject(result); });

    return d.promise();
  };

  function parseRequestUrl(args, callback) {
    var parsedUrl = url.parse(args.request.url, true);
    var params = {};
    if (parsedUrl.search != '') {
      params = querystring.parse(parsedUrl.search.replace(/^\?/, ''));
    }
    callback(params);
  }

  function parseRequestBody(args, callback) {
    switch (is(args.request, ['urlencoded', 'json', 'multipart'])) {
      case 'multipart'  : return parseMultipartBody(args.request, callback);
      case 'urlencoded' : return parseUrlEncodeBody(args.request, callback);
    }
  }

  function parseMultipartBody(request, callback) {
    var form = new multiparty.Form();
    form.parse(request, function(err, fields, files) {
      var result = { _FILE: fileParams(files) };
      callback(result);
    });
  }

  function parseUrlEncodeBody(request, callback) {
    var data = '';
    request.on('data', function(chunk) { data += chunk; });
    request.on('end', function() { callback(querystring.parse(data)); });
  }

  function fileParams(files) {
    var results = {};
    var fileFields = Object.keys(files);
    for (var i = 0; i < fileFields.length; i++) {
      var field = fileFields[i];
      var path  = field.split(/^_FILE./)[1];
      results[path] = filePaths(files[field]);
    }
    return results;
  }

  function filePaths(files) {
    var paths = [];
    for (var i = 0; i < files.length; i++) {
      if (files[i].size > 0) {
        paths.push(files[i].path);
      }
    }
    return paths;
  }

  function chooseExecuter(handlerArgs, params) {
    var handlerClass = null;

    switch(checkRequestMethod(handlerArgs.request.method, params)) {
      case 'GET'    : handlerClass = GetHandler; break;
      case 'DELETE' : handlerClass = DeleteHandler; break;
      case 'PATCH'  : handlerClass = PatchHandler; break;
      case 'POST'   : handlerClass = PostHandler; break;
    }

    delete params._method
    handlerArgs['requestParams'] = updateDbParams(params);
    return new handlerClass(handlerArgs);
  }

  function checkRequestMethod(method, params) {
    if (method == 'POST' && params._method) {
      return params._method.toUpperCase();
    } else {
      return method;
    }
  }

  return RequestHandler;
})();

module.exports = RequestHandler;
