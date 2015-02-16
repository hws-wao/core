var _DB = {
  "event": {
    "id": "1234567890",
    "name": "2015年もヤルぞ！新年会！！",
    "memo": "新宿某所で開催しちゃいます！",
    "schedule": [{
      "date": "1/13 19:00～"
    }, {
      "date": "1/14 19:30 or 20:00"
    }, {
      "date": "1/15 19時"
    }, {
      "date": "2月にしてくれ！"
    }],
    "entry": [{
      "name": "たろう",
      "comment": "がんばります！",
      "schedule": [{
        "reply": "2"
      }, {
        "reply": "2"
      }, {
        "reply": "2"
      }, {
        "reply": "2"
      }]
    }, {
      "name": "はなこ",
      "comment": "あまり飲めません",
      "schedule": [{
        "reply": "0"
      }, {
        "reply": "2"
      }, {
        "reply": "1"
      }, {
        "reply": "2"
      }]
    }, {
      "name": "次郎",
      "comment": "XSS対策<script>alert('xss');</script>",
      "schedule": [{
        "reply": "2"
      }, {
        "reply": "1"
      }, {
        "reply": "0"
      }, {
        "reply": "2"
      }]
    }]
  }
};
var _FILE = {};
var _USR = {
  "replyClass": {
    "0": "fa fa-remove text-danger",
    "1": "fa fa-warning text-warning",
    "2": "fa fa-circle text-success"
  },
  "appendClass": function(v, o) {
    var a = (o + ' ' + v).split(' ');
    var r = [];
    for (var i in a) {
      a[i] == '' ? void(0) : r.push(a[i]);
    }
    return r.join(' ');
  }
};