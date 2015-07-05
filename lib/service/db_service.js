'use strict';

var DbDao = require('../dao/db_dao'),
  AppError = require('../dto/app_error'),
  utils = require('../utils/utils'),
  authUtils = require('../utils/auth_utils');

var DbService = (function() {

  var DbService = function(app) {
    this.dbDao = new DbDao(app);
    this.logger = app.logger;
  };

  DbService.prototype.get = function(key, value, meta) {
    var that = this;
    var d = $.Deferred();
    var result = {};
    var dbResult = result[key] = {};

    if (!value || Object.keys(value).length == 0) {
      return d.resolve(result);
    }

    if (value['_meta'] === '_collections') {
      (this.dbDao.listCollections())()
      .done(function(items) {
          dbResult[value['meta']] = items;
          d.resolve(result);
        })
        .fail(function(err) {
          d.reject(new AppError(500, null, {
            message: 'コレクション情報取得に失敗しました。' + err
          }));
        });
    } else {
      try {
        var selector = convertReqParamsToDbSelector(value);

        var execCount = 0;
        var targetCount = Object.keys(selector).length;

        for (var collectionName in selector) {
          var daoArgs = {};
          daoArgs['colName'] = collectionName;
          daoArgs['query'] = selector[collectionName];
          if (value[collectionName]['_desc']) {
            daoArgs['sort'] = {};
            daoArgs['sort'][value[collectionName]['_desc']] = -1;
          } else {
            daoArgs['sort'] = value[collectionName]['_asc'];
          }
          // TODO：数値チェック
          daoArgs['skip'] = value[collectionName]['_offset'];
          daoArgs['limit'] = value[collectionName]['_limit'];

          (this.dbDao.find(daoArgs))()
          .done(function(collectionName, docs) {
              that.logger.info('read権限チェック collectionName=' + collectionName);
              if (!authUtils.isReadable(docs, meta['_LOGIN_INFO'])) {
                return d.reject(new AppError(403, null, {
                  message: 'read権限がありません'
                }));
              }
              docs["_length"] = docs.length;
              dbResult[collectionName] = docs;
              execCount++;
              if (execCount == targetCount) {
                d.resolve(result);
              }
            })
            .fail(function(err) {
              d.reject(new AppError(500, null, {
                message: 'DB情報取得に失敗しました。' + err
              }));
            });
        }

        if (execCount == targetCount) {
          d.resolve(result);
        }
      } catch (e) {
        d.reject(e);
      }
    }

    return d.promise();
  };

  DbService.prototype.post = function(key, value, meta) {
    var that = this;
    var d = $.Deferred();
    var result = {};
    var dbResult = result[key] = {};

    if (!value || Object.keys(value).length == 0) {
      return d.resolve(result);
    }

    try {
      var execCount = 0;
      var targetCount = Object.keys(value).length;

      for (var collectionName in value) {
        if (utils.isProhibitedCharacters(collectionName) != null) {
          return d.reject(new AppError(500, null, {
            message: 'コレクション名に禁則文字が含まれています [' + collectionName + ']'
          }));;
        }

        if (utils.isOmitParameter(collectionName)) {
          targetCount--;
          break;
        }

        // metaの権限情報を追加
        $.extend(value[collectionName], meta._AUTH);

        var daoArgs = {};
        daoArgs['colName'] = collectionName;
        daoArgs['docs'] = encryptObject(value[collectionName]);
        var prohibitedFileld = utils.isProhibitedCharacters(daoArgs['docs']);
        if (prohibitedFileld != null) {
          return d.reject(new AppError(500, null, {
            message: 'フィールド名に禁則文字が含まれています [' + prohibitedFileld + ']'
          }));
        }

        (this.dbDao.insert(daoArgs))()
        .done(function(collectionName, docs) {
            dbResult[collectionName] = docs;
            execCount++;
            if (execCount === targetCount) {
              d.resolve(result);
            }
          })
          .fail(function(err) {
            d.reject(new AppError(500, null, {
              message: 'DB登録に失敗しました。' + err
            }));
          });
      }

      if (execCount == targetCount) {
        d.resolve(result);
      }
    } catch (e) {
      d.reject(e);
    }

    return d.promise();
  };

  DbService.prototype.patch = function(key, value, meta) {
    var that = this;
    var d = $.Deferred();
    var result = {};

    if (!value || Object.keys(value).length == 0) {
      return d.resolve(result);
    }

    try {
      var selector = convertReqParamsToDbSelector(value._cond);
      var execCount = 0;
      var targetCount = Object.keys(selector).length;
      if (targetCount == 0) {
        d.resolve(result);
      }

      for (var collectionName in selector) {
        if (utils.isOmitParameter(collectionName)) {
          targetCount--;
          break;
        }

        var prohibitedFileld = utils.isProhibitedCharacters(value[collectionName]);
        if (prohibitedFileld != null) {
          return d.reject(new AppError(500, null, {
            message: 'フィールド名に禁則文字が含まれています [' + prohibitedFileld + ']'
          }));
        }

        var daoArgs = {};
        daoArgs['colName'] = collectionName;
        daoArgs['doc'] = createUpdateDocument(value[collectionName]);
        if (Object.keys(daoArgs['doc']).length == 0) {
          targetCount--;
          break;
        }
        daoArgs['selector'] = selector[collectionName];

        authUtils.isWritable(this.dbDao, collectionName, selector[collectionName], meta['_LOGIN_INFO'])
          .done(function(collectionName, docs) {
            (that.dbDao.update(daoArgs))()
            .done(function(collectionName) {
                execCount++;
                if (execCount === targetCount) {
                  d.resolve(result);
                }
              })
              .fail(function(err) {
                d.reject(new AppError(500, null, {
                  message: 'DB更新に失敗しました。' + err
                }));
              });
          }).fail(function(err) {
            return d.reject(new AppError(500, null, {
              message: 'write権限がありません' + err
            }));
          });
      }

      if (execCount == targetCount) {
        d.resolve(result);
      }
    } catch (e) {
      d.reject(e);
    }

    return d.promise();
  };

  DbService.prototype.delete = function(key, value, meta) {
    var that = this;
    var d = $.Deferred();
    var result = {};
    var dbResult = result[key] = {};

    if (!value || Object.keys(value).length == 0) {
      return d.resolve(result);
    }

    try {
      var selector = convertReqParamsToDbSelector(value._cond);
      var execCount = 0;
      var targetCount = Object.keys(selector).length;

      if (targetCount == 0) {
        d.resolve(result);
      }
      for (var collectionName in selector) {
        var daoArgs = {};
        daoArgs['colName'] = collectionName;
        daoArgs['selector'] = selector[collectionName];

        authUtils.isWritable(this.dbDao, collectionName, selector[collectionName], meta['_LOGIN_INFO'])
          .done(function(collectionName, docs) {
            dbResult[collectionName] = docs;
            (that.dbDao.remove(daoArgs))()
            .done(function(collectionName) {
                execCount++;
                if (execCount === targetCount) {
                  d.resolve(result);
                }
              })
              .fail(function(err) {
                d.reject(new AppError(500, null, {
                  message: 'DB削除に失敗しました。' + err
                }));
              });
          }).fail(function(err) {
            return d.reject(new AppError(500, null, {
              message: 'write権限がありません' + err
            }));
          });
      }

      if (execCount == targetCount) {
        d.resolve(result);
      }
    } catch (e) {
      d.reject(e);
    }

    return d.promise();
  };

  //
  // リクエストパラメータからDbのselectorに引き渡すオブジェクトを生成する
  // パラメータ名 : [or__[ {group_name}__ ]] {collection.field_name}[__{operand}][__enc]
  //
  // @param {Object} params
  // @return {Object} collection毎のselector
  //
  function convertReqParamsToDbSelector(params) {
    var selectors = {};
    var groups = {};

    if (params == undefined) {
      return selectors;
    }
    // まずは、collection毎にselectorをつめる箱を用意する
    for (var key in params) {
      if (utils.isOmitParameter(key)) {
        break;
      }
      var collectionName;
      var group_name;
      if (key.match(/(.+)__/)) {
        // keyに「__」が含まれている場合、group_nameとcollectionNameを分割する
        var keyArr = key.split('__');
        if (keyArr.length == 3) {
          // group_nameが指定された場合：or__group_name__ collection
          group_name = keyArr[0] + '__' + keyArr[1];
          collectionName = keyArr[2];
        } else {
          // group_nameが省略された場合：or__ collection
          group_name = keyArr[0]; // orをgroup_nameとする
          collectionName = keyArr[1];
        }
      } else {
        // group_nameなしの場合：key=collectionName
        collectionName = key;
      }
      if (!selectors[collectionName]) {
        selectors[collectionName] = {};
        groups[collectionName] = [];
      }
      if (group_name) {
        groups[collectionName].push(group_name);
      }
    }

    // collection毎にselectorを生成する
    for (var collectionName in selectors) {
      // 当該collectionに'all'が指定されている場合、検索条件なし
      if (params[collectionName] == 'all') {
        // TODO:暫定対応
        // 本来は、collactionName=allの指定なしで全件取得できるようにする
        // GETパラメータを元にfindした結果、_DBに詰めたコレクション毎の情報に
        // data-wao-bindで指定したコレクションの情報がなかったら、条件なしで取得するようにする
        break;
      }

      var collectionKey;
      if (groups[collectionName].length == 0) {
        collectionKey = collectionName;
        selectors[collectionName]['$and'] = createConditionByGroup(params[collectionKey]);
      } else {
        // group_nameを補完してパラメータを取得する
        selectors[collectionName]['$and'] = [];
        for (var i = 0; i < groups[collectionName].length; i++) {
          collectionKey = groups[collectionName][i] + '__' + collectionName;
          var orCondition = {};
          orCondition['$or'] = createConditionByGroup(params[collectionKey]);
          selectors[collectionName]['$and'].push(orCondition);
        };
      }
    }

    return selectors;
  }

  //
  // group_name毎のselectorを生成する
  //
  // @param {Object} params
  // @return {Object} group_name毎のselector
  //
  function createConditionByGroup(params) {
    var result = [];
    var arrayCondition = {};

    if (Array.isArray(params)) {
      // 1つのフィールドに対して複数の条件が指定されている場合
      for (var i = 0; i < params.length; i++) {
        for (var fieldKey in params[i]) {
          if (!utils.isOmitParameter(fieldKey)) {
            if (!fieldKey.match(/(.+)__n?in/)) {
              result.push(createCondition(fieldKey, params[i][fieldKey]));
            } else {
              // $in,$ninは形式が異なるので個別にやる
              createArrayCondition(arrayCondition, fieldKey, params[i][fieldKey]);
            }
          }
        }
      }
    } else {
      for (var fieldKey in params) {
        if (!utils.isOmitParameter(fieldKey)) {
          if (!fieldKey.match(/(.+)__n?in/)) {
            result.push(createCondition(fieldKey, params[fieldKey]));
          } else {
            // $in,$ninは形式が異なるので個別にやる
            createArrayCondition(arrayCondition, fieldKey, params[fieldKey]);
          }
        }
      }
    }

    // $in,$nin
    for (var field in arrayCondition) {
      var condition = {};
      condition[field] = {};
      if (arrayCondition[field]['$in'].length > 0) {
        condition[field]['$in'] = arrayCondition[field]['$in'];
      }
      if (arrayCondition[field]['$nin'].length > 0) {
        condition[field]['$nin'] = arrayCondition[field]['$nin'];
      }
      result.push(condition);
    }

    return result;
  }

  //
  // field毎のselectorを生成する($in、$nin以外)
  //
  // @param {string} key　{collection.field_name}[__{operand}][__enc]
  // @param {string} value 条件
  // @return {Object} field毎のselector
  //
  function createCondition(key, value) {
    var result = {};
    var field;
    var operand;
    var isEncrypt = false;

    if (key.match(/(.+)__/)) {
      // keyに「__」が含まれている場合、fieldとoperandを分割する
      var keyArr = key.split('__');
      field = keyArr[0]
      operand = keyArr[1];
      if (operand == 'enc') {
        isEncrypt = true;
        operand = 'eq';
      }
      if (keyArr.length >= 2) {
        if (keyArr[2] == 'enc') {
          isEncrypt = true;
        }
      }
    } else {
      // operandなしの場合は、$eqとする
      field = key;
      operand = 'eq';
    }
    if (operand == 'in') {
      return null;
    }

    if (isEncrypt) {
      value = utils.encrypt(value);
    }

    result[field] = {};
    result[field]['$' + operand] = value;

    return result;
  }

  //
  // field毎のselectorを生成する($in、$nin)
  //
  // @param {array} array　keyが同一の条件を格納した配列
  // @param {string} key　{collection.field_name}[__{operand}][__enc]
  // @param {string} value 条件
  // @return {Object} field毎のselector
  //
  function createArrayCondition(array, key, value) {
    var keyArr = key.split('__');
    var field = keyArr[0]
    var operand = keyArr[1];
    if (keyArr.length >= 3) {
      if (keyArr[2] == 'enc') {
        value = utils.encrypt(value);
      }
    }

    if (!array[field]) {
      array[field] = {};
      array[field]['$in'] = [];
      array[field]['$nin'] = [];
    }

    array[field]['$' + operand].push(value);

    return array;
  }

  function createUpdateDocument(params) {
    var result = {};

    if (params == undefined) {
      return result;
    }

    for (var key in params) {
      if (utils.isOmitParameter(key)) {
        break;
      }

      if (typeof params[key] == "object") {
        // $push
        if (!result['$push']) {
          result['$push'] = {};
        }
        result['$push'][key] = encryptObject(params[key]);
      } else if (Array.isArray(params[key])) {
        // $pushAll
        if (!result['$pushAll']) {
          result['$pushAll'] = {};
        }
        result['$pushAll'][key] = utils.encrypt(params[key]);
      } else {
        // $set
        if (!result['$set']) {
          result['$set'] = {};
        }

        // field名が'__enc'で終わっている場合、暗号化しfield名から'__enc'を除く
        if (key.match(/__enc$/)) {
          result['$set'][key.replace(/__enc$/, '')] = utils.encrypt(params[key]);
        } else {
          result['$set'][key] = params[key];
        }
      }
    }

    return result;
  }

  function encryptObject(object) {
    for (var key in object) {
      if (typeof object[key] == "object") {
        encryptObject(object[key]);
      } else {
        // field名が'__enc'で終わっている場合、暗号化しfield名から'__enc'を除く
        if (key.match(/__enc$/)) {
          object[key.replace(/__enc$/, '')] = utils.encrypt(object[key]);
          delete object[key];
        }
      }
    }
    return object;
  }

  return DbService;
})();

module.exports = DbService;
