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
  return crypted;
};

exports.decrypt = function(target) {
  var decipher = crypto.createDecipher('aes-256-cbc', config.get('secret'));
  var dec = decipher.update(target, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
};

/**
 * オブジェクトの全ての値を配列で返す
 * @param {object} obj - 値を取り出したいオブジェクト
 * @return {Array} - 引数のオブジェクトの全ての値（prototypeチェーンは無視する）
 */
exports.objValues = function objValues(obj) {
  var a = [],
    i = 0,
    p;
  for (p in obj) {
    if (obj.hasOwnProperty(p)) {
      a[i++] = obj[p];
    }
  }
  return a;
};

/**
 * オブジェクトの最下層に値を設定する
 *
 * @param {object} obj - 設定されるオブジェクト
 * @param {*} value - 設定する値
 * @return {object} - 値を設定したオブジェクト
 */
exports.addValueBottomLayer = function　 addValueBottomLayer(obj, value) {
  var objValue = exports.objValues(obj)[0];

  if (typeof objValue !== 'object') {
    obj[Object.keys(obj)[0]] = value;
  } else {
    addValueBottomLayer(objValue, value);
  }

  return obj;
};
