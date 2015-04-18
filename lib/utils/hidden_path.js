'use strict';

var crypto = require('crypto'),
    path   = require('path'),
    config = require('config');

var HiddenPath = (function() {

  var HiddenPath = function(args) {
    this.prefix = '/_res/';
  };

  var p = HiddenPath.prototype;

  p.encrypt = function(rawPath) {
    var cipher = crypto.createCipher('aes-256-cbc', config.get('secret'));
    var crypted = cipher.update(rawPath, 'utf-8', 'hex');
    crypted += cipher.final('hex');
    return this.prefix + crypted + path.extname(rawPath);
  };

  p.decrypt = function(encPath) {
    var decipher = crypto.createDecipher('aes-256-cbc', config.get('secret'));
    var extName = path.extname(encPath);
    var encPath = encPath.replace(/^\/_res\//, '').replace(extName, '');

    var dec = decipher.update(encPath,'hex','utf8');
    dec += decipher.final('utf8');
    return dec;
  };

  p.isHiddenPath = function(filePath) {
    if(filePath.match(/^\/_res\//)) {
      return true;
    } else {
      return false;
    }
  }

  return HiddenPath;
})();

module.exports = HiddenPath;
