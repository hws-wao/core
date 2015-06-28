'use strict';

/**
 * 当該documentに権限が設定されている場合、
 * 引き渡された権限オブジェクトにread権限があるか確認する
 * 
 * @param {object} docs 操作対象のdocument
 * @param {object} auth 権限オブジェクト
 * @return read権限がある場合、true
 */
exports.isReadable = function isReadable(docs, auth) {
  for (var i = 0; i < docs.length; ++i) {
    if (!checkAuth(docs[i], auth, 'r')) {
      return false;
    }
  }
  return true;
};

/**
 * 当該documentに権限が設定されている場合、
 * 引き渡された権限オブジェクトにwrite権限があるか確認する
 * 
 * @param {object} that 
 * @param {string} collectionName コレクション名
 * @param {object} selector selector
 * @param {object} auth 権限オブジェクト
 */
exports.isWritable = function isWritable(that, collectionName, selector, auth) {
  var d = $.Deferred();

  var daoArgs = {};
  daoArgs['colName'] = collectionName;
  daoArgs['query'] = selector;

  (that.dbDao.find(daoArgs))()
  .done(function(collectionName, docs) {
      for (var i = 0; i < docs.length; ++i) {
        if (!checkAuth(docs[i], auth, 'w')) {
          d.reject();
        }
      }
      d.resolveWith(null, [collectionName, docs]);
    })
    .fail(function(err) {
      d.reject(new AppError(500, null, {
        message: 'DB情報取得に失敗しました。' + err
      }));
    });
  return d.promise();
};

/**
 * 当該documentに権限が設定されている場合、
 * 引き渡された権限オブジェクトでread可能であるか確認する
 * 
 * @param {object} doc 操作対象のdocument
 * @param {object} auth 権限オブジェクト
 * @param {string} rw r:読み込み/w:書き込み
 * @return read/write権限がある場合、true
 */
function checkAuth(doc, auth, rw) {
  var owner = doc['_owner'];
  var group = doc['_group'];
  // TODO:カラム名はCONFIGから取得する
  if (!doc['_owner'] && !doc['_group']) {
    // documentに権限が設定されていない場合、書き込み／読み込む可
    return true;
  }

  var user = 'o';
  if (owner === auth['_owner']) {
    user = 'u';
  } else {
    if (containsGroup(auth['_group'], group)) {
      user = 'g';
    }
  }

  var permission = getPermission(doc['_permission'], user);
  if (rw === 'r') {
    return hasReadpPrmission(permission);
  } else {
    return hasWritePrmission(permission);
  }
}

/**
 * 権限オブジェクトのグループに指定したグループが含まれるかどうかチェックする
 *
 * @param {string|array} authGroup 権限オブジェクトのグループ
 * @param {string|array} target チェック対象のdocumentのグループ
 * @return read権限がある場合、true
 */
function containsGroup(authGroup, target) {
  var result = false;
  if (Array.isArray(authGroup)) {
    for (var i = 0; i < authGroup.length; ++i) {
      if (containsGroup(authGroup[i], target)) {
        result = true;
        break;
      }
    }
  } else {
    if (Array.isArray(target)) {
      if ($.inArray(authGroup, target) >= 0) {
        result = true;
      }
    } else {
      if (authGroup === target) {
        result = true;
      }
    }
  }
  return result;
}

/**
 * 指定ユーザの権限を取得する<br>
 * 設定されていない場合は、デフォルトパーミッション(rw-r--r--)を返却する
 * 
 * @param {object} permission 
 * @param {string} user u:所有者/g:グループ/o:その他
 * @return 指定ユーザのパーミッション
 */
function getPermission(permissions, user) {
  var result;
  var defaultPermissions = 'rw-r--r--';
  if (!permissions) {
    if (user === 'u') {
      result = 'rw-';
    } else {
      result = 'r--';
    }
  } else {
    // 補完
    if (permissions.length != defaultPermissions.length) {
      permissions = defaultPermissions.slice(permissions.length - defaultPermissions.length);
    }
    if (user === 'u') {
      result = permissions.substr(0, 3);
    } else if (user === 'g') {
      result = permissions.substr(3, 3);
    } else {
      result = permissions.substr(6, 3);
    }
  }
  return result;
}

/**
 * read権限があるか確認する
 *
 * @param {object} permission　documentに付与された権限
 * @return read権限がある場合、true
 */
function hasReadpPrmission(permission) {
  var readableRegExp = new RegExp("r..");
  if (readableRegExp.test(permission)) {
    return true;
  }
  return false;
}

/**
 * write権限があるか確認する
 * 
 * @param {object} permission　documentに付与された権限
 * @return write権限がある場合、true
 */
function hasWritePrmission(permission) {
  var writableRegExp = new RegExp(".w.");
  if (writableRegExp.test(permission)) {
    return true;
  }
  return false;
}
