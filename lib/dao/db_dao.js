/**
 * @file DBeのDaoクラス。
 *
 * @author aoyagi
 * @version 2.3.0
 *
 * @module hws-wao/lib/dao/db_dao.js
 */
'use strict';

/**
 * @class DbDao<br>
 * DBのDaoクラス
 *
 * @param {App} app WAOアプリケーションオブジェクト
 */
var DbDao = (function() {
  var DbDao = function(app) {
    this.mongoDb = app.mongoDb;
    this.logger = app.logger;
  };

  /**
   * DB接続
   * 
   * @return {promise} 同期オブジェクト
   */
  DbDao.prototype.open = function() {
    var that = this;
    var d = new $.Deferred;
    this.mongoDb.open(function(err, db) {
      if (err != null) {
        d.reject(err);
        return;
      }
      d.resolve();
    });
    return d.promise();
  };

  /**
   * DB切断
   *
   * @return {promise} 同期オブジェクト
   */
  DbDao.prototype.close = function() {
    var that = this;

    return function() {
      var d = new $.Deferred;
      that.mongoDb.close(true, function(err, db) {
        if (err != null) {
          // error ignore
          that.logger.error(err);
        }
        d.resolve();
      });
      return d.promise();
    }
  };

  /**
   * コレクションにドキュメントを登録する
   *
   * @param {object} args パラメタ群
   * @param {string} args.colName コレクション名
   * @param {object} args.docs 登録対象のdocument
   * @return {function} DB登録を非同期で処理するfunction
   */
  DbDao.prototype.insert = function(args) {
    var that = this;

    return function() {
      var d = new $.Deferred;
      var colName = args.colName;
      var docs = args.docs;

      var createdDate = new Date().getTime();
      docs.id = (createdDate + Math.random() + '').replace('.', '');
      docs._createdDate = createdDate;

      that.logger.info('insert collectionName->' + colName);
      that.logger.info('insert docs->' + JSON.stringify(docs));

      var options = getInsertOption(args);

      that.mongoDb.collection(colName, function(err, coll) {
        if (err != null) {
          that.logger.info('Error mongoDb.collection for insert. collectionName=' + colName);
          d.reject(err);
          return;
        }
        coll.insert(docs, options, function(err, result) {
          if (err != null) {
            that.logger.error('Error mongoDb.insert. collectionName=' + colName);
            d.reject(err);
            return;
          }
          that.logger.info('insert result->' + JSON.stringify(result));
          that.logger.info('insert inserted docs->' + JSON.stringify(docs));
          d.resolveWith(null, [colName, docs]);
        });
      });
      return d.promise();
    }
  };

  /**
   * コレクションからドキュメントを削除する
   *
   * @param {object} args パラメタ群
   * @param {string} args.colName コレクション名
   * @param {object} args.selector 削除条件
   * @return {function} DB削除を非同期で処理するfunction
   */
  DbDao.prototype.remove = function(args) {
    var that = this;

    return function() {
      var d = new $.Deferred;
      var colName = args['colName'];
      var selector = args['selector'];

      that.logger.info('remove collectionName->' + colName);
      that.logger.info('remove selector->' + JSON.stringify(selector));

      var options = getRemoveOption(args);

      that.mongoDb.collection(colName, function(err, coll) {
        if (err != null) {
          that.logger.error('Error mongoDb.collection for remove. collectionName=' + colName);
          d.reject(err);
          return;
        }
        coll.remove(selector, {
          w: 1
        }, function() {
          if (err != null) {
            that.logger.error('Error mongoDb.remove. collectionName=' + colName);
            d.reject(err);
          }
          d.resolve();
        });
      });
      return d.promise();
    }
  };

  /**
   * ドキュメントの指定フィールドを更新する
   *
   * @param {object} args パラメタ群
   * @param {string} args.colName コレクション名
   * @param {object} args.selector 更新条件
   * @param {object} args.doc 更新内容
   * @param {boolean} args.upsert upsertする場合は、true(default:false)
   * @param {boolean} args.multi 更新条件に合致するドキュメントが複数存在した際、全て更新する場合は、true(default:false)
   * @return {function} DB更新を非同期で処理するfunction
   */
  DbDao.prototype.update = function(args) {
    var that = this;

    return function() {
      var d = new $.Deferred;
      var colName = args['colName'];
      var selector = args['selector'];
      var doc = args['doc'];

      that.logger.info('update collectionName->' + colName);
      that.logger.info('update selector->' + JSON.stringify(selector));
      that.logger.info('update doc->' + JSON.stringify(doc));

      var options = getUpdateOption(args);
      that.logger.info('update options->' + JSON.stringify(options));

      that.mongoDb.collection(colName, function(err, coll) {
        if (err != null) {
          that.logger.error('Error mongoDb.collection for update. collectionName=' + colName);
          d.reject(err);
          return;
        }

        coll.update(selector, doc, options, function(err, result) {
          if (err != null) {
            that.logger.error('Error mongoDb.update. collectionName=' + colName);
            that.logger.error(err);
            d.reject(err);
          }
          that.logger.info('update result->' + JSON.stringify(result));
          d.resolve(colName);
        });
      });
      return d.promise();
    }
  };

  /**
   * 条件に合致したドキュメントの件数を返却する
   *
   * @param {object} args パラメタ群
   * @param {string} args.colName コレクション名
   * @param {object} args.query 検索条件
   * @param {number} args.skip 開始位置
   * @param {number} args.limit 上限件数
   * @return {function} 件数取得を非同期で処理するfunction
   */
  DbDao.prototype.count = function(args) {
    var that = this;

    return function() {
      var d = new $.Deferred;
      var colName = args['colName'];
      var query = args['query'];
      var skip;
      var limit;

      that.logger.info('count collectionName->' + colName);
      that.logger.info('count query->' + JSON.stringify(query));

      var options = getFindOption(args);
      that.logger.info('count options->' + JSON.stringify(options));

      that.mongoDb.collection(colName, function(err, coll) {
        if (err != null) {
          that.logger.error('Error mongoDb.collection for count. collectionName=' + colName);
          d.reject(err);
          return;
        }

        coll.count(query, options, function(err, count) {
          if (err != null) {
            that.logger.error('Error mongoDb.count. collectionName=' + colName);
            that.logger.error(err);
            d.reject(err);
          }
          that.logger.info('count->' + count);
          d.resolveWith(null, [count]);
        });
      });
      return d.promise();
    }
  };

  /**
   * 条件に合致したドキュメントを返却する
   *
   * @param {object} args パラメタ群
   * @param {string} args.colName コレクション名
   * @param {object} args.query 検索条件
   * @param {number} args.skip 開始位置
   * @param {number} args.limit 上限件数
   * @param {string} args.sort ソート条件
   * @return {function} 検索を非同期で処理するfunction
   */
  DbDao.prototype.find = function(args) {
    var that = this;

    return function() {
      var d = new $.Deferred;
      var colName = args['colName'];
      var query = args['query'];

      that.logger.info('find collectionName->' + colName);
      that.logger.info('find query->' + JSON.stringify(query));

      var options = getFindOption(args);
      that.logger.info('find options->' + JSON.stringify(options));

      that.mongoDb.collection(colName, function(err, coll) {
        if (err != null) {
          that.logger.error('Error mongoDb.collection for find. collectionName=' + colName);
          d.reject(err);
          return;
        }
        coll.find(query, options).toArray(function(err, docs) {
          if (err != null) {
            that.logger.info('Error mongoDb.find. collectionName=' + colName);
            that.logger.info(err);
            d.reject(err);
          }
          if (docs) {
            that.logger.info('find count->' + docs.length);
            that.logger.info('find docs->' + JSON.stringify(docs));
          }
          d.resolveWith(null, [colName, docs]);
        });
      });
      return d.promise();
    }
  };

  /**
   * コレクション一覧取得
   *
   * @return {function} コレクション一覧取得を非同期で処理するfunction
   */
  DbDao.prototype.listCollections = function() {
    var that = this;

    return function() {
      var d = new $.Deferred;
      that.mongoDb.collectionNames(function(err, items) {
        d.resolveWith(null, [items]);
      });
      return d.promise();
    }
  };

  /**
   * 登録オプションオブジェクトを生成する
   *
   * @param {object} args パラメタ群
   * @return {object} 登録オプションオブジェクト
   */
  function getInsertOption(args) {
    return {
      w: 1,
      fullResult: true
    };
  }

  /**
   * 削除オプションオブジェクトを生成する
   *
   * @param {object} args パラメタ群
   * @return {object} 削除オプションオブジェクト
   */
  function getRemoveOption(args) {
    return {
      w: 1
    };
  }

  /**
   * 更新オプションオブジェクトを生成する
   *
   * @param {object} args パラメタ群
   * @param {boolean} args.upsert upsertする場合は、true(default:false)
   * @param {boolean} args.multi 更新条件に合致するドキュメントが複数存在した際、全て更新する場合は、true(default:false)
   * @return {object} 更新オプションオブジェクト
   */
  function getUpdateOption(args) {
    var upsert = false;
    var multi = false;

    if (args) {
      if (args['upsert']) {
        if (typeof args['upsert'] == 'boolean') {
          upsert = args['upsert'];
        }
      }
      if (args['multi']) {
        if (typeof args['multi'] == 'boolean') {
          multi = args['multi'];
        }
      }
    }

    var options = {
      w: 1,
      upsert: upsert,
      multi: multi,
      fullResult: true
    }
    return options;
  }

  /**
   * 検索オプションオブジェクトを生成する
   *
   * @param {object} args パラメタ群
   * @param {number} args.skip 開始位置
   * @param {number} args.limit 上限件数
   * @param {string} args.sort ソート条件
   * @return {object} 検索オプションオブジェクト
   */
  function getFindOption(args) {
    var options = {};
    if (args) {
      if (args['skip']) {
        options.skip = args['skip'];
      }
      if (args['limit']) {
        options.limit = args['limit'];
      }
      if (args['sort']) {
        options.sort = args['sort'];
      }
    }
    return options;
  }

  return DbDao;
})();

module.exports = DbDao;
