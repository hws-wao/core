var mongo       = require('mongodb'),
    Server      = require('mongodb').Server,
    undefined;

// WAO用のmongoDB操作クラス
var Db = (function() {
  var mongoDb;

  // Constructer
  //
  // @param {String} dbName name of the database.
  var Db = function(args) {
    var dbName = args['dbName'];
    console.log('dbName=' + dbName);
    // TODO：何でもかんでもつなぎにいっちゃうバカなやつ???
    // TODO：optionsを設定可能とする
    this.mongoDb = new mongo.Db(dbName, new Server('localhost', mongo.Connection.DEFAULT_PORT, {}));
  };

  var waoDbPrototype = Db.prototype;

  // Open the database connection.
  //
  // @return {promise}
  waoDbPrototype.open = function() {
    var deferred = new $.Deferred;
    this.mongoDb.open(function(err, db) {
      if (err != null) {
        console.log('Error to open mongoDb connection.');
        deferred.reject(err);
        return;
      }
      console.log('Success to open mongoDb connection.');
      deferred.resolve();
    });
    return deferred.promise();
  };

  // Close the current mongoDb connection.
  //
  // @param {boolean} forceClose connection can never be reused.
  // @return {promise}
  waoDbPrototype.close = function(args) {
    var me = this;

    return function(){
      var deferred = new $.Deferred;
      var forceClose = false;
      if (args != undefined && args['forceClose'] != undefined) {
        if (typeof args['forceClose'] == 'boolean') {
          forceClose = args['forceClose'];
        } else {
          // TODO:無視していい？
        }
      }
      if (forceClose) {
        console.log('close force mongoDb connection.');
      }
      me.mongoDb.close(forceClose, function(err, db) {
        if (err != null) {
          // error ignore
          console.log('Error to close mongoDb connection.');
          console.log(err);
        }
        console.log('Success to close mongoDb connection.');
        deferred.resolve();
      });
      return deferred.promise();
    }
  };

  // Inserts a single document or a an array of documents into mongoDB.
  //
  // @param {String} colName collection name for the insert.
  // @param {Object} docs(json) 
  // @return {promise}
  waoDbPrototype.insert = function(args) {
    var me = this;

    return function(){
      var deferred = new $.Deferred;
      var colName = args['colName'];
      var docs = args['docs'];

      var createdDate = new Date().getTime();
      docs.id = (createdDate + Math.random() + '').replace('.', '');
      docs._createdDate = createdDate;

      console.log('insert collectionName->' + colName);
      console.log('insert docs->' + JSON.stringify(docs));

      // TODO：どのoptionsを設定可能とするかもう少し検討する
      var options = {
          w: 1,
          fullResult : true
      }

      me.mongoDb.collection(colName, function(err, coll) {
        if (err != null) {
          console.log('Error mongoDb.collection for insert. collectionName=' + colName);
          deferred.reject(err);
          return;
        }

        coll.insert(docs, options, function(err, result) {
          if (err != null) {
            console.log('Error mongoDb.insert. collectionName=' + colName);
            deferred.reject(err);
            return;
          }
          console.log('insert result->' + JSON.stringify(result));
          console.log('insert inserted docs->' + JSON.stringify(docs));
          deferred.resolveWith(null, [colName, docs]);
        });
      });
      return deferred.promise();
    }
  };

  // Removes documents specified by <code>selector</code> from the mongoDb.
  //
  // @param {String} colName collection name for the remove.
  // @param {String} selector condition for delete.
  // @return {promise}
  waoDbPrototype.remove = function(args) {
    var me = this;

    return function(){
      var deferred = new $.Deferred;
      var colName = args['colName'];
      var selector = args['selector'];

      console.log('remove collectionName->' + colName);
      console.log('remove selector->' + JSON.stringify(selector));

      // TODO：optionsを設定可能とする
      me.mongoDb.collection(colName, function(err, coll) {
        if (err != null) {
          console.log('Error mongoDb.collection for remove. collectionName=' + colName);
          deferred.reject(err);
          return;
        }

        // TODO：optionsを設定可能とする
        coll.remove(selector, {w:1}, function() {
          if (err != null) {
            console.log('Error mongoDb.remove. collectionName=' + colName);
            deferred.reject(err);
          }
          deferred.resolve();
        });
      });
      return deferred.promise();
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
  waoDbPrototype.update = function(args) {
    var me = this;

    return function(){
      var deferred = new $.Deferred;
      var colName = args['colName'];
      var selector = args['selector'];
      var doc = args['doc'];
      var upsert = false;
      var multi = false;

      console.log('update collectionName->' + colName);
      console.log('update selector->' + JSON.stringify(selector));
      console.log('update doc->' + JSON.stringify(doc));

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
          upsert : upsert,
          multi : multi,
          fullResult : true
      }
      console.log('update options->' + JSON.stringify(options));

      me.mongoDb.collection(colName, function(err, coll) {
        if (err != null) {
          console.log('Error mongoDb.collection for update. collectionName=' + colName);
          deferred.reject(err);
          return;
        }

        coll.update(selector, doc, options, function(err, result) {
          if (err != null) {
            console.log('Error mongoDb.update. collectionName=' + colName);
            console.log(err);
            deferred.reject(err);
          }
          console.log('update result->' + JSON.stringify(result));
          deferred.resolve(null);
        });
      });
      return deferred.promise();
    }
  };

  // Count number of matching documents in the mongoDb to a query.
  //
  // @param {String} colName collection name for the count.
  // @param {String} query query to filter by before performing count.
  // @param {Number, Option} skip The number of documents to skip for the count.
  // @param {Number, Option} limit The limit of documents to count.
  // @return {promise}
  waoDbPrototype.count = function(args) {
    var me = this;

    return function(){
      var deferred = new $.Deferred;
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
      var options = {
      }
      if (skip != undefined) {
        options.skip = skip;
      }
      if (limit != undefined) {
        options.limit = limit;
      }
      console.log('count options->' + JSON.stringify(options));

      me.mongoDb.collection(colName, function(err, coll) {
        if (err != null) {
          console.log('Error mongoDb.collection for count. collectionName=' + colName);
          deferred.reject(err);
          return;
        }

        coll.count(query, options, function(err, count) {
          if (err != null) {
            console.log('Error mongoDb.count. collectionName=' + colName);
            console.log(err);
            deferred.reject(err);
          }
          console.log('count->' + count);
          deferred.resolveWith(null, [count]);
        });
      });
      return deferred.promise();
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
  waoDbPrototype.find = function(args) {
    var me = this;

    return function(){
      var deferred = new $.Deferred;
      var colName = args['colName'];
      var query = args['query'];
      var fields = args['fields'];
      var skip;
      var limit;
      var sort = args['sort'];

      console.log('find collectionName->' + colName);
      console.log('find query->' + JSON.stringify(query));

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
      var options = {
      }
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

      me.mongoDb.collection(colName, function(err, coll) {
        if (err != null) {
          console.log('Error mongoDb.collection for find. collectionName=' + colName);
          deferred.reject(err);
          return;
        }
        coll.find(query, options).toArray(function(err, docs) {
          if (err != null) {
            console.log('Error mongoDb.find. collectionName=' + colName);
            console.log(err);
            deferred.reject(err);
          }
          console.log('find count->' + docs.length);
          console.log('find docs->' + JSON.stringify(docs));
          deferred.resolveWith(null, [colName, docs]);
        });
      });
      return deferred.promise();
    }
  };

  return Db;
})();

module.exports = Db;
