'use strict';

var path = require('path');

var utils = require('./utils');

var HiddenPath = (function() {

  var HiddenPath = function(args) {
    this.prefix = '/_res/';
  };

  var p = HiddenPath.prototype;

  p.encrypt = function(rawPath) {
    return this.prefix + utils.encrypt(rawPath) + path.extname(rawPath);
  };

  p.decrypt = function(encPath) {
    var extName = path.extname(encPath);
    var encPath = encPath.replace(/^\/_res\//, '').replace(extName, '');
    return utils.decrypt(encPath);
  };

  p.isHiddenPath = function(filePath) {
    if (filePath.match(/^\/_res\//)) {
      return true;
    } else {
      return false;
    }
  }

  return HiddenPath;
})();

module.exports = HiddenPath;
