/**
 * オブジェクト定義
 */

function TokyoMetroDelay() {
  this.init();
}


/**
 * 初期化
 */

TokyoMetroDelay.prototype.init = function() {

  this.defineProperty();
  this.setCurrentTime()
  this.setSelectDate();
  this.setSelectTimezone();
  this.setDocumentSelecter();
  this.initDraw();
  this.handleEvents();
  this.handleFirebase();

  this.loading = true;
  this.data = {};

}


/**
 * 既存のプロパティを定義する
 */

TokyoMetroDelay.prototype.defineProperty = function() {

  Object.defineProperty(Object.prototype, "forIn", {
    value: function(fn, self) {
      self = self || this;

      Object.keys(this).forEach(function(key, index) {
        var value = this[key];

        fn.call(self, key, value, index);
      }, this);
    }
  });

}


/**
 * htmlのセレクタを設定
 */

TokyoMetroDelay.prototype.setDocumentSelecter = function() {

  this.$list = document.getElementById('list');
  this.$info = document.getElementById('appInfo');
  this.$date = document.getElementById('currentDate');
  this.$time = document.getElementById('currentTime');
  this.$prev = document.getElementById('previousTimezone');
  this.$next = document.getElementById('nextTimezone');

}


/**
 * 現在の日付・時間帯をセットする
 */

TokyoMetroDelay.prototype.setCurrentTime = function() {

  var today = new Date();
  var arrayDate = [today.getUTCFullYear(), today.getUTCMonth()+1, today.getUTCDate()];

  if (19 <= today.getUTCHours()) {
    this.currentDate = displaceArrayDate(arrayDate, 1);
  } else {
    this.currentDate = arrayDate;
  }

  this.currentTimezone = getTimezone(today);

  return;

}



/**
 * 選択する日付をセットする
 */

TokyoMetroDelay.prototype.setSelectDate = function() {

  var param = getUrlVars().date;

  if (typeof param !== "undefined") {
    arrayDate = encodeArrayDate(param);
    if (arrayDate) {
      this.selectDate = arrayDate;
      return;
    }
  }

  this.selectDate = this.currentDate;

  return;

}


/**
 * 選択する時間帯をセットする
 * Make: this.selectTimezone
 */

TokyoMetroDelay.prototype.setSelectTimezone = function() {

  var param = getUrlVars().timezone;

  if (typeof param !== "undefined") {
    switch (param) {
      case 'a':
      case 'b':
      case 'c':
      case 'd':
        this.selectTimezone = param;
        return;
    }
  }

  this.selectTimezone = this.currentTimezone;

  return;

}


/**
 * 前の時間帯にセット
 */

TokyoMetroDelay.prototype.setPreviousTimezone = function() {

  var self = this;

  switch (this.selectTimezone) {
    case 'a':
      this.selectTimezone = 'd';
      this.selectDate = displaceArrayDate(this.selectDate, -1);
      this.drawCurrentDate();

      old_data = this.firebase.database().ref('data_v1').orderByChild('date').equalTo(decodeArrayDate(displaceArrayDate(this.selectDate, -1), '-'));
      old_data.on('value', function(snapshot) {
        self.loadedData(snapshot.val());
      });

      break;
    case 'b':
      this.selectTimezone = 'a';
      break;
    case 'c':
      this.selectTimezone = 'b';
      break;
    case 'd':
      this.selectTimezone = 'c';
      break;
  }

  this.setSelectData();
  this.drawCurrentTimezone();
  this.drawControlArrow();

  return;

}


/**
 * 次の時間帯にセット
 */

TokyoMetroDelay.prototype.setNextTimezone = function() {

  switch (this.selectTimezone) {
    case 'a':
      this.selectTimezone = 'b';
      break;
    case 'b':
      this.selectTimezone = 'c';
      break;
    case 'c':
      this.selectTimezone = 'd';
      break;
    case 'd':
      this.selectTimezone = 'a';
      this.selectDate = displaceArrayDate(this.selectDate, 1);
      this.drawCurrentDate();
      break;
  }
  this.setSelectData();
  this.drawCurrentTimezone();
  this.drawControlArrow();

  return;

}


/**
 * 選択している時間帯の遅延路線をセットする
 */

TokyoMetroDelay.prototype.setSelectData = function() {

  var self = this;
  var tmp = 0;

  var date = decodeArrayDate(this.selectDate, '-');

  this.data.forIn(function(key, value, index) {
    if (value.date == date && value.timezone == self.selectTimezone) {
      tmp = key;
      return;
    }
  });

  if (tmp === 0) {
    this._line = false;
    this._data = false;
    return false;
  }

  this._line = [];
  this._data = this.data[tmp];

  switch (this._data['@type']) {
    case 'now':
      this._target = 'delay_max';
      break;
    case 'log':
      this._target = 'certificate';
      break;
  }

  for (var line in this._data['line']) {
    if (this._data['line'][line][this._target] > 0) {
      this._line[this._line.length] = line;
    }
  }

  return true;

}


/**
 * イベントを登録する
 */

TokyoMetroDelay.prototype.handleEvents = function() {

  var self = this;

  this.$prev.addEventListener("click", function(event) {
    self.setPreviousTimezone();
    self.draw();
  }, false);

  this.$next.addEventListener("click", function(event) {
    self.setNextTimezone();
    self.draw();
  }, false);

  setInterval(function() {
    self.setCurrentTime();
    self.drawControlArrow();
  }, 300000);

}


/**
 * イベントを登録する
 */

TokyoMetroDelay.prototype.handleFirebase = function() {

  var self = this;
  this.firebase = firebase;

  var config = {
    apiKey: "AIzaSyD9-btg4czHVhZfcnotSNZ06qpt-jq4XKk",
    authDomain: "tokyometrodelay.firebaseapp.com",
    databaseURL: "https://tokyometrodelay.firebaseio.com",
    storageBucket: "tokyometrodelay.appspot.com",
    messagingSenderId: "266088211944"
  };
  this.firebase.initializeApp(config);

  latest_data = this.firebase.database().ref('data_v1').orderByChild('date').equalTo(decodeArrayDate(this.currentDate, '-'));
  latest_data.on('value', function(snapshot) {
    self.loadedData(snapshot.val());
  });

  all_data = this.firebase.database().ref('data_v1').orderByChild('date').startAt(decodeArrayDate(displaceArrayDate(this.currentDate, -5), '-')).endAt(decodeArrayDate(displaceArrayDate(this.currentDate, -1), '-'));
  all_data.on('value', function(snapshot) {
    self.loadedData(snapshot.val());
  });

}


/**
 * データがロードし終わったときの処理
 * @param {Object}
 */

TokyoMetroDelay.prototype.loadedData = function(obj) {

  this.loading = false;
  this.dataMerge(obj);
  this.setSelectData();
  this.draw();

}


/**
 * データをマージする
 * @param {Object}
 */

TokyoMetroDelay.prototype.dataMerge = function(obj) {

  if (!obj) {
    obj = {};
  }
  for (var attrname in obj) {
      if (obj.hasOwnProperty(attrname)) {
          this.data[attrname] = obj[attrname];
      }
  }

}


/**
 * 初回の描画
 */

TokyoMetroDelay.prototype.initDraw = function() {

  this.drawInfo('loading');
  this.drawCurrentDate();
  this.drawCurrentTimezone();
  this.drawControlArrow();

}


/**
 * 描画
 */

TokyoMetroDelay.prototype.draw = function() {

  var self = this;

  var oldDelayLineCount = document.querySelectorAll('.line-delay').length;
  var delayLineCount = this._line.length;
  var infoClass = this.$info.classList[2];

  if (this.loading) { // ロード中
    this.drawInfo('loading');
    return true;
  }
  if (oldDelayLineCount == 0 && delayLineCount == 0) { // 変更前も変更後も 遅延路線なし
    this.drawInfo('scheduled');
    return true;
  }
  if (oldDelayLineCount == 0 && !this._line && (infoClass == 'info-nodata' || infoClass == 'info-scheduled' || infoClass == 'info-loader')) {
    this.drawInfo('nodata');
    return true;
  }

  this.drawInfo('null');
  this.$list.classList.add('is-changing');

  this.drawDelayLine();

  setTimeout(function() {
    self.$list.classList.remove('is-changing');
  }, 300);

}


/**
 * 遅延路線にクラスをセット
 */

TokyoMetroDelay.prototype.drawDelayLine = function() {

  var self = this;

  // 遅延路線リセット
  this.$list.classList.remove('list--count_' + document.querySelectorAll('.line-delay').length);
  Array.prototype.forEach.call(this.$list.querySelectorAll('.line-delay'), function(e) {
    e.classList.remove('line-delay');
    e.querySelector('a').href = '';
  });
  var delay = document.querySelectorAll('.delay-text');
  Array.prototype.forEach.call(delay, function(node) {
    node.parentNode.removeChild(node);
  });

  // 遅延路線セット
  if (this._line.length > 0) {
    this._line.forEach(function(line) {
      self.$list.querySelector('li[data-line-name=' + line + ']').classList.add('line-delay');

      if (self._target == 'certificate') {
        href = 'http://www.tokyometro.jp/delay/detail/' + decodeArrayDate(self.selectDate, '') + '/' + line + '_' + encodeTimezone(self.selectTimezone) + '.shtml';
        self.$list.querySelector('li[data-line-name=' + line + ']').querySelector('a').href = href;
      }

      var ele = document.createElement('span');
      var str = document.createTextNode(delayTextToSimple(self._data["line"][line][self._target]));
      ele.classList.add('delay-text');
      ele.appendChild(str);

      self.$list.querySelector('li[data-line-name=' + line + '] .line-text').appendChild(document.createTextNode(' '));
      self.$list.querySelector('li[data-line-name=' + line + '] .line-text').appendChild(ele);

    });
    this.$list.classList.add('list--count_' + this._line.length);
  } else if (!this._line) {
    this.drawInfo('nodata');
  } else {
    this.drawInfo('scheduled');
  }

}


/**
 * インフォメーションを描画
 */

TokyoMetroDelay.prototype.drawInfo = function(v) {

  this.$info.classList.remove('info-loading', 'info-scheduled', 'info-nodata');

  switch (v) {
    case 'null':
      this.$info.querySelector('.info-text').innerHTML = '';
      break;

    case 'loading':
      this.$info.classList.add('info-loading');
      this.$info.querySelector('.info-text').innerHTML = '読み込み中';
      break;

    case 'scheduled':
      this.$info.classList.add('info-scheduled');
      this.$info.querySelector('.info-text').innerHTML = '時刻通り';
      break;

    case 'nodata':
      this.$info.classList.add('info-nodata');
      this.$info.querySelector('.info-text').innerHTML = 'データなし';
      break;

    case 'hide':
      break;
  }

}


/**
 * 選択中の日付を描画
 */

TokyoMetroDelay.prototype.drawCurrentDate = function() {

  this.$date.innerHTML = decodeArrayDate(this.selectDate, '.', true);

  return;

}


/**
 * 選択中の時間帯を描画
 */

TokyoMetroDelay.prototype.drawCurrentTimezone = function() {

  var time;

  switch (this.selectTimezone) {
    case 'a':
      time = ' ~ 7:00';
      break;
    case 'b':
      time = '7:00 ~ 10:00';
      break;
    case 'c':
      time = '10:00 ~ 17:00';
      break;
    case 'd':
      time = '17:00 ~ ';
      break;
    default:
      time = ' ~ 7:00';
      break;
  }

  if (this.selectDate.toString() + this.selectTimezone === this.currentDate.toString() + this.currentTimezone) {
    time = time.replace(/~.*/g, '~ 現在');
  }

  this.$time.innerHTML = time;

}


/**
 * コントロール矢印の描画
 */

TokyoMetroDelay.prototype.drawControlArrow = function() {

  var c = this.currentDate;
  var s = this.selectDate;

  c = c[0] * 500 + c[1] * 40 + c[2];
  s = s[0] * 500 + s[1] * 40 + s[2];

  if (c < s) {
    this.$next.classList.add('is-invalid');
    return;
  }
  if (c > s) {
    this.$next.classList.remove('is-invalid');
    return;
  }

  c = this.currentTimezone;
  s = this.selectTimezone;

  if (c <= s) {
    this.$next.classList.add('is-invalid');
    return;
  }
  if (c > s) {
    this.$next.classList.remove('is-invalid');
    return;
  }

  return;

}


/**
 * URLのパラメータを取得する
 * @returns {Object}
 */

var getUrlVars = function() {

  var vars = {};
  var param = location.search.substring(1).split('&');
  for (var i = 0; i < param.length; i++) {
    var keySearch = param[i].search(/=/);
    var key = '';
    if (keySearch != -1) key = param[i].slice(0, keySearch);
    var val = param[i].slice(param[i].indexOf('=', 0) + 1);
    if (key != '') vars[key] = decodeURI(val);
  }
  return vars;

}


/**
 * 遅延テキストをシンプルにする
 * @param {String} v
 * @returns {String}
 */

var delayTextToSimple = function(v) {

  v = parseInt(v);

  if (v > 61) {
    return '61+分';
  } else {
    return '+' + v + '分';
  }

}


/**
 * 日付のタイムゾーンを取得
 * @param {Object} date
 * @returns {String}
 */

var getTimezone = function(date) {

  var timezoneBorder = [4, 7, 10, 17];
  var hour = date.getUTCHours() + 9;

  if (hour >= 24) hour -= 24;

  if      (timezoneBorder[0] <= hour && hour < timezoneBorder[1]) return 'a';
  else if (timezoneBorder[1] <= hour && hour < timezoneBorder[2]) return 'b';
  else if (timezoneBorder[2] <= hour && hour < timezoneBorder[3]) return 'c';
  else if (timezoneBorder[3] <= hour || hour < timezoneBorder[0]) return 'd';

}


/**
 * 配列の日付をずらす
 * @param {Array} date
 * @param {Number} displace
 * @returns {Array}
 */

var displaceArrayDate = function(date, displace) {

  var obj = new Date(date[0], date[1] - 1, date[2]);

  obj.setDate(obj.getDate() + displace);

  date = [obj.getFullYear(), obj.getMonth() + 1, obj.getDate()];

  return date;

}


/**
 * 文字列の日付を配列に変換
 * 変換出来ない場合、falseを返す
 * @param {String} v
 * @returns {Array|Boolean}
 */

var encodeArrayDate = function(v) {

  var format = v.match(/([0-9]{4})-([0-9]{2})-([0-9]{2})/g);
  if (!format) return false;

  v = v.replace(/-0/g , '-') ;
  v = v.split('-');

  v[0] = parseInt(v[0]);
  v[1] = parseInt(v[1]);
  v[2] = parseInt(v[2]);

  dt = new Date(v[0], v[1] - 1, v[2]);
  if (dt.getFullYear() != v[0] || dt.getMonth() != v[1] - 1 || dt.getDate() != v[2]) return false;

  return v;

}


/**
 * 配列の日付を文字列に変換
 * 変換出来ない場合、falseを返す
 * @param {Array} v
 * @param {String} p 区切り文字
 * @param {Boolean} w 曜日の有無
 * @returns {String|Boolean}
 */

var decodeArrayDate = function(v, p, w) {

  var weekDayList = ['日', '月', '火', '水', '木', '金', '土'];

  if (typeof p === 'undefined') w = '-';
  if (typeof w === 'undefined') w = false;

  var dt = new Date(v[0], v[1] - 1, v[2]);
  if (dt.getFullYear() != v[0] || dt.getMonth() != v[1] - 1 || dt.getDate() != v[2]) return false;

  var str = '';
  str += v[0];
  str += p;
  str += (v[1] < 10) ? '0' + v[1] : v[1];
  str += p;
  str += (v[2] < 10) ? '0' + v[2] : v[2];

  if (w === true) {
    str += ' ';
    str += weekDayList[dt.getDay()];
  }

  return str;

}


/**
 * タイムゾーンの形式を変換する
 * @param {String} v
 * @returns {String}
 */

var encodeTimezone = function(v) {

  switch (v) {
    case 'a':
      return '1';
    case 'b':
      return '2';
    case 'c':
      return '3';
    case 'd':
      return '4';
  }

}


var app = new TokyoMetroDelay();
