var utils = require('../utils/utils');

var DbService = (function() {

  var DbService = function(args) {
    this.app = args.app;
  };

  var p = DbService.prototype;

  p.get = function(args) {
    var that = this;
    var d = $.Deferred();
    var result = {};

    if (!args || Object.keys(args).length == 0) {
      return d.resolve(result);
    }

    try {
      var selector = convertReqParamsToDbSelector(args);

      var execCount = 0;
      var targetCount = Object.keys(selector).length;

      for (var collectionName in selector) {
        var daoArgs = {};
        daoArgs['colName'] = collectionName;
        daoArgs['query'] = selector[collectionName];
        if (args[collectionName]['_desc']) {
          daoArgs['sort'] = {};
          daoArgs['sort'][args[collectionName]['_desc']] = -1;
        } else {
          daoArgs['sort'] = args[collectionName]['_asc'];
        }
        // TODO：数値チェック
        daoArgs['skip'] = args[collectionName]['_offset'];
        daoArgs['limit'] = args[collectionName]['_limit'];

        (that.app.db.find(daoArgs))()
        .done(function(collectionName, docs) {
            result[collectionName] = docs;
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

    return d.promise();
  };

  p.post = function(args) {
    var that = this;
    var d = $.Deferred();
    var result = {};

    if (!args || Object.keys(args).length == 0) {
      return d.resolve(result);
    }

    try {
      var execCount = 0;
      var targetCount = Object.keys(args).length;

      for (var collectionName in args) {
        if (utils.isOmitParameter(collectionName)) {
          targetCount--;
          break;
        }

        var daoArgs = {};
        daoArgs['colName'] = collectionName;
        daoArgs['docs'] = args[collectionName];

        (that.app.db.insert(daoArgs))()
        .done(function(collectionName, docs) {
            result[collectionName] = docs;
            execCount++;
            if (execCount === targetCount) {
              d.resolve(result);
            }
          })
          .fail(function(e) {
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

  p.patch = function(args) {
    var d = $.Deferred();

    return d.promise();
  };

  p.delete = function(args) {
    var that = this;
    var d = $.Deferred();
    var result = {};

    if (!args || Object.keys(args).length == 0) {
      return d.resolve(result);
    }

    // まずは削除対象をfindして、resultにセットする
    that.get(args)()
      .done(function(getResult) {
        result = getResult;
        try {
          var selector = convertReqParamsToDbSelector(args);
          var execCount = 0;
          var targetCount = Object.keys(selector).length;

          for (var collectionName in selector) {
            var daoArgs = {};
            daoArgs['colName'] = collectionName;
            daoArgs['selector'] = selector[collectionName];

            (that.app.db.remove(daoArgs))()
            .done(function() {
                execCount++;
                if (execCount == targetCount) {
                  d.resolve(result);
                }
              })
              .fail(function(e) {
                d.reject(e);
              });
          }

          if (execCount == targetCount) {
            d.resolve(result);
          }
        } catch (e) {
          d.reject(e);
        }
      })
      .fail(function(result) {
        result.reqid = that.reqid;
        d.reject(result);
      });

    return d.promise();
  };

  //
  // リクエストパラメータからDbのselectorに引き渡すオブジェクトを生成する
  // パラメータ名 : [or__[ {group_name}__ ]] {collection.field_name}[__{operand}]
  //
  // @param {Object} params
  // @return {Object} collection毎のselector
  //
  function convertReqParamsToDbSelector(params) {
    var selectors = {};
    var groups = {};

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
  // @param {string} key　{collection.field_name}[__{operand}]
  // @param {string} value 条件
  // @return {Object} field毎のselector
  //
  function createCondition(key, value) {
    var result = {};
    var field;
    var operator;
    if (key.match(/(.+)__/)) {
      // keyに「__」が含まれている場合、fieldとoperatorを分割する
      var keyArr = key.split('__');
      field = keyArr[0]
      operator = keyArr[1];
    } else {
      // operatorなしの場合は、$eqとする
      field = key;
      operator = 'eq';
    }
    if (operator == 'in') {
      return null;
    }
    result[field] = {};
    result[field]['$' + operator] = value;

    return result;
  }

  //
  // field毎のselectorを生成する($in、$nin)
  //
  // @param {array} array　keyが同一の条件を格納した配列
  // @param {string} key　{collection.field_name}[__{operand}]
  // @param {string} value 条件
  // @return {Object} field毎のselector
  //
  function createArrayCondition(array, key, value) {
    var field = key.match(/(.+)__(n?in)/)[1];
    var operand = key.match(/(.+)__(n?in)/)[2];

    if (!array[field]) {
      array[field] = {};
      array[field]['$in'] = [];
      array[field]['$nin'] = [];
    }
    array[field]['$' + operand].push(value);

    return array;
  }

  return DbService;
})();

module.exports = DbService;
