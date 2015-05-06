'use strict';

var crypto = require('crypto'),
  config = require('config');

exports.isProhibitedCharacters = function(target) {
  var result = null;
  if (typeof target == "object") {
    for (var key in target) {
      if (typeof target[key] == "object") {
        result = this.isProhibitedCharacters(target[key]);
      } else {
        result = this.isProhibitedCharacters(key);
      }
      if (result != null) {
        return result;
      }
    }
  } else {
    if (target.match(/^__/)) {
      return target;
    }
  }
  return null;
};

exports.isOmitParameter = function(target) {
  if (target.match(/^_/)) {
    return true;
  }
  return false;
};

exports.encrypt = function(target) {
  var cipher = crypto.createCipher('aes-256-cbc', config.get('secret'));
  var crypted = cipher.update(target, 'utf-8', 'hex');
  crypted += cipher.final('hex');
  console.log('utils encrypt --> ' + crypted);
  return crypted;
};

exports.decrypt = function(target) {
  var decipher = crypto.createDecipher('aes-256-cbc', config.get('secret'));
  var dec = decipher.update(target, 'hex', 'utf8');
  dec += decipher.final('utf8');
  console.log('utils decrypt --> ' + dec);
  return dec;
};
