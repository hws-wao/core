/**
 * @fileoverview HTMLにJSONをバインド処理するjQueryプラグインです。
 * jQueryをrequireしたNode.js上でも動作することを念頭に作成しています。
 * @author m_kimura@headwaters.co.jp(Kimura,Manabu)
 */
"use strict";
(function($){
  /**
   * WAOバインド。HTMLにJSONをバインド処理します。
   * @param
   * @return {jQuery}
   */
  $.fn.wao_bind = function(options) {
    /**
     * WAOバインドに必要なデータと、バインド時に利用するiterator情報を保持します。
     * @type {Object} オプション指定（バインドするデータ、iteratorの状態）
     */
    var settings = $.extend({
      'bindData' : {
        '_DB'   : {},
        '_FILE' : {}
      },
      'iterators' : {}
    }, options);

    /**
     * 指定の変数名を持つコア変数を探して返却します。
     * @param {string}
     */
    var searchCore = function(varName) {
      var props = Object.keys(settings.bindData);
      for (var idx in props) {
        if (props[idx] == varName) {
          return settings.bindData;
        } else if (settings.bindData[props[idx]][varName]) {
          return settings.bindData[props[idx]];
        }
      }
      throw "Bind or Iterator data is not found.";
    }

    // -------------------------------------
    // ピリオドで分割した変数名のうち指定された順番の変数名を返す
    // -------------------------------------
    var getVarName = function(varPath, index) {
      var varName = varPath.split(".");
      if (varName.length < index) {
        throw "Index Out Of Bounds. Variable Path's Count:="
         + varName.length + ", Index:=" + index;
      }
      return varName[index];
    }

    // -------------------------------------
    // bind指定値を変数に変換する
    // -------------------------------------
    var getVar = function(varPath) {
      var firstVarName = getVarName(varPath, 0);
      var root = searchCore(firstVarName)[firstVarName];
      if (root) {
        var ret = root;
        var paths = varPath.split(".");
        var iteratorPath = firstVarName;
        // 先頭はfirstVarName→rootで処理済みなので開始番号は1から
        for (var i = 1; i < paths.length; i++) {
          ret = getVarWithIterator(ret, iteratorPath)[paths[i]];
          iteratorPath += '.' + paths[i];
        }
      }
      return ret;
    }

    // -------------------------------------
    // iteratorがスタックされていればそれを返却する
    // -------------------------------------
    var getVarWithIterator = function(variable, iteratorPath) {
      var retVar = variable;
      var iterator = settings.iterators[iteratorPath];
      if (iterator) {
        retVar = iterator.this[iterator.idx];
      }
      return retVar;
    }

    // -------------------------------------
    // data-wao-iteratorの実行
    // -------------------------------------
    var iterate = function($this, iteratorPath) {
      // 予備動作
      var $parent = $this.parent(); // 親要素を取得する
      var $template = $this.removeAttr('data-wao-iterator').clone(); // 自分自身をテンプレート化
      var iterator = getIterator(iteratorPath); // 繰り返し用の変数を取得しておく
      $parent.html(''); // 自分自身（兄弟も）を削除する
      // 繰り返し処理本体
      // iteratorは配列であることが保障されているのでfor-inを使用
      for (var idx in iterator) {
        var $temporary = $template.clone(); // テンプレートをコピー
        // bind処理用にiterator情報を作成する
        var mysettings = $.extend(settings, {});
        mysettings.iterators[iteratorPath] = {
          'this' : iterator, // iterator変数（配列）
          'idx'  : idx // インデクス値
        };
        $temporary.wao_bind(mysettings); // 繰り返しbind処理
        $parent.append($temporary); // 1件分の生成結果を親要素に追加
      }
    }

    // -------------------------------------
    // iteratorを取得する
    // -------------------------------------
    var getIterator = function(iteratorPath) {
      var iterator = getVar(iteratorPath);
      // iteratorとして使用する変数は配列でなければならない
      return ($.isArray(iterator)) ? iterator : [iterator];
    }

    // -------------------------------------
    // bind用の編集を返却する
    // -------------------------------------
    var bindVar = function(variable) {
      // bind対象の変数が配列の場合には変換が必要
      if ($.isArray(variable)) {
        if (variable.length == 1) { // 要素数が1個ならbind可能
          variable = variable[0];
        // 要素数が0または2以上の配列をbindしようとしたらエラー
        } else if (variable.length == 0) {
          throw "Bind data is not found.";
        } else {
          throw "Bind data is too many.";
        }
      }
      return variable;
    }

    /**
     * クエリストリングのバインド処理
     */
    var bindGetParam = function(target) {
      // ?hoge=hoge&hoge=hoge....部分を抜き出す
      var getparam = target.match(/\?([^=]+=([^&]*)?&?)*/);
      var getparamR = '';
      if (getparam) { // URLにGETパラメタが含まれていれば
        getparamR = '?';
        getparam = getparam[0].replace(/^\?/,'').split('&'); // hoge=hogeに分割して配列化
        for (var i in getparam) {
          var paramName = getparam[i].split('=')[0];
          var paramValue = getparam[i].split('=')[1];
          // 既にbindされている場合は、対象外とする
          if (paramValue.trim() == '') {
            var variable = bindVar(getVar(paramName));
            getparamR += paramName + '=' + variable + '&';
          } else {
            getparamR += paramName + '=' + paramValue + '&'; // 元の形に戻す
          }
        }
        getparamR = getparamR.slice(0, -1);
      }
      return target.replace(/\?([^=]+=([^&]*)?&?)*/, '') + getparamR;
    }

    // -------------------------------------
    // 指定された要素を先頭に、すべての要素に対してbind処理を行う
    // -------------------------------------
    return this.each(function() {
      var $this = $(this);
      // data-wao-iterator
      // 自分自身がiteratorならiterate処理を行う
      var iterator = $this.attr('data-wao-iterator');
      if (iterator) {
        iterate($this, iterator);
      }
      // data-wao-bind
      // 自分自身にbindが含まれていたらbind処理を行う
      var bind = $this.attr('data-wao-bind');
      if (bind) { // この要素にbind属性が指定されていたら
        $this.html(bindVar(getVar(bind)));
        $this.removeAttr('data-wao-bind'); // 属性を削除
      }
      // data-wao-bind-xxx
      // 自分自身にbind-xxx（属性bind）が含まれていたら属性bind処理を行う
      // 属性名はセレクタで完全一致である必要があるため
      // 対象ノード以下の属性値をすべて取得し、
      // その中からdata-wao-bind-xxx形式の属性名を一覧取得する
      var attrs = [];
      $.each($this.get(0).attributes, function(idx, attr) {
        if (attr.name.match(/^data-wao-bind-/)) {
          bind = $this.attr(attr.name);
          if (bind) { // この要素に属性bind属性が指定されていたら
            var bindAttr = attr.name.replace(/^data-wao-bind-/, '');
            $this.attr(bindAttr, bindVar(getVar(bind)));
            $this.removeAttr(attr.name); // 属性を削除
          }
        }
      });
      // hrefやsrcへのバインド処理
      var href = $this.attr('href');
      if (href) {
        $this.attr('href', bindGetParam(href));
      }
      var src = $this.attr('src');
      if (src) {
        $this.attr('src', bindGetParam(src));
      }

      // 自分の子供にすべて同じことを実行
      $this.children().each(function() {
        $(this).wao_bind(settings);
      });
    });
  };
})(window.jQuery);