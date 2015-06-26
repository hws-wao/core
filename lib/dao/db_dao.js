'use strict';

var Db = (function() {
  var mongoDb;

  // コンストラクタ
  //
  // @param {Object} mongoDb
  var Db = function(app) {
    this.mongoDb = app.mongoDb;
    this.logger = app.logger;
  };

  var p = Db.prototype;

  // Open the database connection.
  //
  // @return {promise}
  p.open = function() {
    var that = this;
    var d = new $.Deferred;
    this.mongoDb.open(function(err, db) {
      if (err != null) {
        that.logger.error('Error to open mongoDb connection.');
        d.reject(err);
        return;
      }
      that.logger.info('Success to open mongoDb connection.');
      d.resolve();
    });
    return d.promise();
  };

  // Close the current mongoDb connection.
  //
  // @param {boolean} forceClose connection can never be reused.
  // @return {promise}
  p.close = function(args) {
    var that = this;

    return function() {
      var d = new $.Deferred;
      var forceClose = false;
      if (args != undefined && args['forceClose'] != undefined) {
        if (typeof args['forceClose'] == 'boolean') {
          forceClose = args['forceClose'];
        } else {
          // TODO:無視していい？
        }
      }
      if (forceClose) {
        that.logger.info('close force mongoDb connection.');
      }
      that.mongoDb.close(forceClose, function(err, db) {
        if (err != null) {
          // error ignore
          that.logger.error('Error to close mongoDb connection.');
          that.logger.error(err);
        }
        that.logger.info('Success to close mongoDb connection.');
        d.resolve();
      });
      return d.promise();
    }
  };

  // Inserts a single document or a an array of documents into mongoDB.
  //
  // @param {String} colName collection name for the insert.
  // @param {Object} docs(json) 
  // @return {promise}
  p.insert = function(args) {
    var that = this;

    return function() {
      var d = new $.Deferred;
      var colName = args['colName'];
      var docs = args['docs'];

      var createdDate = new Date().getTime();
      docs.id = (createdDate + Math.random() + '').replace('.', '');
      docs._createdDate = createdDate;

      that.logger.info('insert collectionName->' + colName);
      that.logger.info('insert docs->' + JSON.stringify(docs));

      // TODO：どのoptionsを設定可能とするかもう少し検討する
      var options = {
        w: 1,
        fullResult: true
      }

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

  // Removes documents specified by <code>selector</code> from the mongoDb.
  //
  // @param {String} colName collection name for the remove.
  // @param {String} selector condition for delete.
  // @return {promise}
  p.remove = function(args) {
    var that = this;

    return function() {
      var d = new $.Deferred;
      var colName = args['colName'];
      var selector = args['selector'];

      that.logger.info('remove collectionName->' + colName);
      that.logger.info('remove selector->' + JSON.stringify(selector));

      // TODO：optionsを設定可能とする
      that.mongoDb.collection(colName, function(err, coll) {
        if (err != null) {
          that.logger.error('Error mongoDb.collection for remove. collectionName=' + colName);
          d.reject(err);
          return;
        }

        // TODO：optionsを設定可能とする
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

  // Updates documents.
  //
  // @param {String} colName collection name for the update.
  // @param {String} selector the query to select the document/documents to be updated.
  // @param {String} doc the fields/vals to be updated, or in the case of an upsert operation, inserted.
  // @param {boolean, default:false} upsert perform an upsert operation.
  // @param {boolean, default:false} multi update all documents matching the selector.
  // @return {promise}
  p.update = function(args) {
    var that = this;

    return function() {
      var d = new $.Deferred;
      var colName = args['colName'];
      var selector = args['selector'];
      var doc = args['doc'];
      var upsert = false;
      var multi = false;

      that.logger.info('update collectionName->' + colName);
      that.logger.info('update selector->' + JSON.stringify(selector));
      that.logger.info('update doc->' + JSON.stringify(doc));

      if (args != undefined && args['upsert'] != undefined) {
        if (typeof args['upsert'] == 'boolean') {
          upsert = args['upsert'];
        } else {
          // TODO:無視していい？
        }
      }
      if (args != undefined && args['multi'] != undefined) {
        if (typeof args['multi'] == 'boolean') {
          multi = args['multi'];
        } else {
          // TODO:無視していい？
        }
      }

      // TODO：どのoptionsを設定可能とするかもう少し検討する
      var options = {
        w: 1,
        upsert: upsert,
        multi: multi,
        fullResult: true
      }
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

  // Count number of matching documents in the mongoDb to a query.
  //
  // @param {String} colName collection name for the count.
  // @param {String} query query to filter by before performing count.
  // @param {Number, Option} skip The number of documents to skip for the count.
  // @param {Number, Option} limit The limit of documents to count.
  // @return {promise}
  p.count = function(args) {
    var that = this;

    return function() {
      var d = new $.Deferred;
      var colName = args['colName'];
      var query = args['query'];
      var skip;
      var limit;

      console.log('count collectionName->' + colName);
      console.log('count query->' + JSON.stringify(query));

      if (args != undefined && args['skip'] != undefined) {
        if (typeof args['skip'] == 'number') {
          skip = args['skip'];
        } else {
          // TODO:無視していい？
        }
      }
      if (args != undefined && args['limit'] != undefined) {
        if (typeof args['limit'] == 'number') {
          limit = args['limit'];
        } else {
          // TODO:無視していい？
        }
      }

      // TODO：どのoptionsを設定可能とするかもう少し検討する
      var options = {}
      if (skip != undefined) {
        options.skip = skip;
      }
      if (limit != undefined) {
        options.limit = limit;
      }
      console.log('count options->' + JSON.stringify(options));

      that.mongoDb.collection(colName, function(err, coll) {
        if (err != null) {
          console.log('Error mongoDb.collection for count. collectionName=' + colName);
          d.reject(err);
          return;
        }

        coll.count(query, options, function(err, count) {
          if (err != null) {
            console.log('Error mongoDb.count. collectionName=' + colName);
            console.log(err);
            d.reject(err);
          }
          console.log('count->' + count);
          d.resolveWith(null, [count]);
        });
      });
      return d.promise();
    }
  };

  // Retuen matching documents in the mongoDb to a query.
  //
  // @param {String} colName collection name for the count.
  // @param {String} query query to filter by before performing count.
  // @param {Object, Option} fields the fields to return in the query. Object of fields to include or exclude (not both), {‘a’:1}
  // @param {Number, Option} skip The number of documents to skip for the count.
  // @param {Number, Option} limit The limit of documents to count.
  // @param {Array | Object, Option} sort set to sort the documents coming back from the query. Array of indexes, [[‘a’, 1]] etc.
  // @return {promise}
  p.find = function(args) {
    var that = this;

    return function() {
      var d = new $.Deferred;
      var colName = args['colName'];
      var query = args['query'];
      var fields = args['fields'];
      var skip;
      var limit;
      var sort = args['sort'];

      console.log('find collectionName->' + colName);
      console.log('find query->' + JSON.stringify(query));

      if (args != undefined && args['skip'] != undefined) {
        skip = args['skip'];
      }
      if (args != undefined && args['limit'] != undefined) {
        limit = args['limit'];
      }

      // TODO：どのoptionsを設定可能とするかもう少し検討する
      var options = {}
      if (fields != undefined) {
        options.fields = fields;
      }
      if (skip != undefined) {
        options.skip = skip;
      }
      if (limit != undefined) {
        options.limit = limit;
      }
      if (sort != undefined) {
        options.sort = sort;
      }
      console.log('find options->' + JSON.stringify(options));

      that.mongoDb.collection(colName, function(err, coll) {
        if (err != null) {
          console.log('Error mongoDb.collection for find. collectionName=' + colName);
          d.reject(err);
          return;
        }
        coll.find(query, options).toArray(function(err, docs) {
          if (err != null) {
            console.log('Error mongoDb.find. collectionName=' + colName);
            console.log(err);
            d.reject(err);
          }
          if (docs) {
            console.log('find count->' + docs.length);
            console.log('find docs->' + JSON.stringify(docs));
          }
          d.resolveWith(null, [colName, docs]);
        });
      });
      return d.promise();
    }
  };

  // Get the list of all collection names for the specified db.
  //
  // @return {promise}
  p.listCollections = function() {
    var that = this;

    return function() {
      var d = new $.Deferred;
      that.mongoDb.collectionNames(function(err, items) {
        d.resolveWith(null, [items]);
      });
      return d.promise();
    }
  };

  return Db;
})();

module.exports = Db;
