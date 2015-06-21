if ($) {
  $.data($('html')[0], 'userdefine', {
    "replyClass": {
      "-1": "fa fa-remove text-danger",
      "0": "fa fa-warning text-warning",
      "1": "fa fa-circle text-success"
    },
    "appendClass": function(v, o) {
      var a = (o + ' ' + v).split(' ');
      var r = [];
      for (var i in a) {
        a[i] == '' ? void(0) : r.push(a[i]);
      }
      return r.join(' ');
    }
  });
}