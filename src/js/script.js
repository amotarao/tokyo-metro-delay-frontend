/**
 * TokyoMetroDelay()
 *
 * オブジェクト定義
 */

function TokyoMetroDelay() {
  this.init();
}


/**
 * init()
 *
 * 初期化
 */

TokyoMetroDelay.prototype.init = function() {
  this.setCurrentTime()
  this.setSelectDate();
  this.setSelectTimezone();
  this.setDocumentSelecter();
  this.initDraw();
  this.handleEvents();

  this.loading = true;
  this.data = JSON.parse('{"' + decodeArrayDate(this.selectDate, '') + '":{"' + this.selectTimezone + '":{"delayLine":[],"delayLineDetail":[]}}}');
  this.getJSON('./api/get');
  this.setDelayLine();
}


/**
 * getJSON()
 *
 * jsonを取得する
 */

TokyoMetroDelay.prototype.getJSON = function(url) {
  var self = this;

  var req = new XMLHttpRequest();
  req.onreadystatechange = function() {
    //  req.onreadystatechange = () => {
    if (req.readyState == 4 && req.status == 200) {
      self.loading = false;
      self.data = JSON.parse(req.responseText);
      self.setDelayLine();
      self.draw();
    }
  };
  req.open('GET', url, true);
  req.send(null);
}


/**
 * setDocumentSelecter()
 *
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
 * setCurrentTime()
 *
 * 現在の日付・時間帯をセットする
 */

TokyoMetroDelay.prototype.setCurrentTime = function() {

  today = new Date();

  arrayDate = [today.getUTCFullYear(), today.getUTCMonth()+1, today.getUTCDate()];
  if (19 <= today.getUTCHours()) {
    this.currentDate = displaceArrayDate(arrayDate, true);
  } else {
    this.currentDate = arrayDate;
  }

  this.currentTimezone = getTimezone(today);

  return;

}



/**
 * setSelectDate()
 *
 * 選択する日付をセットする
 */

TokyoMetroDelay.prototype.setSelectDate = function() {

  param = getUrlVars().date;

  if (typeof param !== "undefined") {
    arrayDate = encodeArrayDate(param);
    if (arrayDate) {
      this.selectDate = arrayDate;
      return;
    }
  }

  this.selectDate = this.currentDate;
  this.drawControlArrow();

  return;

}


/**
 * setSelectTimezone()
 *
 * 選択する時間帯をセットする
 * Make: this.selectTimezone
 */

TokyoMetroDelay.prototype.setSelectTimezone = function() {

  param = getUrlVars().timezone;

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
 * setPreviousTimezone()
 *
 * 前の時間帯にセット
 */

TokyoMetroDelay.prototype.setPreviousTimezone = function() {

  switch (this.selectTimezone) {
    case 'a':
      this.selectTimezone = 'd';
      this.selectDate = displaceArrayDate(this.selectDate, false);
      this.drawCurrentDate();
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
  this.setDelayLine();
  this.drawCurrentTimezone();

  return

}


/**
 * setNextTimezone()
 *
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
      this.selectDate = displaceArrayDate(this.selectDate, true);
      this.drawCurrentDate();
      break;
  }
  this.setDelayLine();
  this.drawCurrentTimezone();

  return;

}


/**
 * setDelayLine()
 *
 * 選択している時間帯の遅延路線をセットする
 * Make:
 */

TokyoMetroDelay.prototype.setDelayLine = function() {

  var date = decodeArrayDate(this.selectDate, '');

  if (date in this.data && this.selectTimezone in this.data[date]) {
    this.currentData = this.data[date][this.selectTimezone]['delayLine'];
    this.currentDataDetail = this.data[date][this.selectTimezone]['delayLineDetail'];
    return true;
  }

  this.currentData = false;
  this.currentDataDetail = false;
  return false;

}


/**
 * handleEvents()
 *
 * イベントを登録する
 */

TokyoMetroDelay.prototype.handleEvents = function() {

  var self = this;

  this.$prev.addEventListener("click", function(event) {
    console.log("clicked");
    self.setPreviousTimezone();
    self.draw();
  }, false);

  this.$next.addEventListener("click", function(event) {
    self.setNextTimezone();
    self.draw();
  }, false);

  var direction, position;
  window.addEventListener("touchstart", function(event) {
    position = event.touches[0].pageX;
    direction = '';
  }, false);
  window.addEventListener("touchmove", function(event) {
    if (position - event.changedTouches[0].pageX > 50) {
      direction = 'left';
    } else if (position - event.changedTouches[0].pageX < -50) {
      direction = 'right';
    }
  }, false);
  window.addEventListener("touchend", function(event) {
    if (direction == 'right') {
      self.setNextTimezone();
      self.draw();
    } else if (direction == 'left') {
      self.setPreviousTimezone();
      self.draw();
    }
  }, false);

  setInterval(function() {
    self.setCurrentTime();
  }, 300000);

}


/**
 * initDraw()
 *
 * 初回の描画
 */

TokyoMetroDelay.prototype.initDraw = function() {
  this.drawInfo('loading');
  this.drawCurrentDate();
  this.drawCurrentTimezone();
}


/**
 * draw()
 *
 * 描画
 */

TokyoMetroDelay.prototype.draw = function() {
  oldDelayLineCount = document.querySelectorAll('.line-delay').length;
  delayLineCount = this.currentData.length;
  if (oldDelayLineCount == 0) infoClass = this.$info.classList[2];

  if (this.loading) { // ロード中
    this.drawInfo('loading');
    return true;
  }
  if (oldDelayLineCount == 0 && delayLineCount == 0) { // 変更前も変更後も 遅延路線なし
    this.drawInfo('scheduled');
    return true;
  }
  if (oldDelayLineCount == 0 && !this.currentData && (infoClass == 'info-nodata' || infoClass == 'info-scheduled' || infoClass == 'info-loader')) {
    this.drawInfo('nodata');
    return true;
  }

  this.drawInfo('null');
  this.$list.classList.add('is-changing');

  this.drawDelayLine();

  var self = this;

  setTimeout(function() {
    self.$list.classList.remove('is-changing');
  }, 300);
}


/**
 * drawDelayLine()
 *
 * 遅延路線にクラスをセット
 */

TokyoMetroDelay.prototype.drawDelayLine = function() {
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
  if (this.currentData.length > 0) {

    var self = this;
    this.currentData.forEach(function(line) {
      self.$list.querySelector('li[data-line-name=' + line + ']').classList.add('line-delay');

      href = 'http://www.tokyometro.jp/delay/detail/' + decodeArrayDate(self.selectDate, '') + '/' + line + '_' + encodeTimezone(self.selectTimezone) + '.shtml';
      self.$list.querySelector('li[data-line-name=' + line + ']').querySelector('a').href = href;

      var ele = document.createElement('span');
      var str = document.createTextNode(delayTextToSimple(self.currentDataDetail[line]));
      ele.classList.add('delay-text');
      ele.appendChild(str);

      self.$list.querySelector('li[data-line-name=' + line + '] .line-text').appendChild(document.createTextNode(' '));
      self.$list.querySelector('li[data-line-name=' + line + '] .line-text').appendChild(ele);

    });
    this.$list.classList.add('list--count_' + this.currentData.length);
//    this.drawInfo('hide');
  } else if (!this.currentData) {
    this.drawInfo('nodata');
  } else {
    this.drawInfo('scheduled');
  }
}


/**
 * drawInfo()
 *
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
 * drawCurrentDate()
 *
 * 選択中の日付を描画
 */

TokyoMetroDelay.prototype.drawCurrentDate = function() {

  this.$date.innerHTML = decodeArrayDate(this.selectDate, '.', true);

  return;

}


/**
 * drawCurrentTimezone()
 *
 * 選択中の時間帯を描画
 */

TokyoMetroDelay.prototype.drawCurrentTimezone = function() {
  var time;

  switch (this.selectTimezone) {
    case 'a':
      var time = '~ 7:00';
      break;
    case 'b':
      var time = '7:00 ~ 10:00';
      break;
    case 'c':
      var time = '10:00 ~ 17:00';
      break;
    case 'd':
      var time = '17:00 ~';
      break;
    default:
      var time = '~ 7:00';
      break;
  }
  var str = document.createTextNode(time);

  //  node.parentNode.removeChild(node);
  this.$time.innerHTML = time;
}


/**
 * drawControlArrow()
 *
 * コントロール矢印の描画
 */

TokyoMetroDelay.prototype.drawControlArrow = function() {

  c = this.currentDate;
  s = this.selectDate;

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

  return

}


/**
 * getUrlVars()
 * URLのパラメータを取得する
 *
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
 * delayTextToSimple()
 * 遅延テキストをシンプルにする
 *
 * @param {String} v
 * @returns {String}
 */

var delayTextToSimple = function(v) {
  if (v.substr(0, 2) == '最大') {
    return '+' + v.substr(2, 3);
  } else {
    return '61+分';
  }
}


/**
 * getTimezone()
 * 日付のタイムゾーンを取得
 * 
 * @param {Object} date
 * @returns {String}
 */

var getTimezone = function(date) {

  timezoneBorder = [4, 7, 10, 17];

  hour = date.getUTCHours() + 9;
  if (date.getUTCMinutes() < 5 && (timezoneBorder.indexOf(hour) >= 0 || timezoneBorder.indexOf(hour-24) >= 0)) hour--;
  if (hour >= 24) hour -= 24;

  if      (timezoneBorder[0] <= hour && hour < timezoneBorder[1]) return 'a';
  else if (timezoneBorder[1] <= hour && hour < timezoneBorder[2]) return 'b';
  else if (timezoneBorder[2] <= hour && hour < timezoneBorder[3]) return 'c';
  else if (timezoneBorder[3] <= hour || hour < timezoneBorder[0]) return 'd';

}


/**
 * displaceArrayDate()
 * 配列の日付をずらす
 * 
 * @param {Array} date
 * @param {Boolean} o
 * @returns {Array}
 */

var displaceArrayDate = function(date, o) {

  if (typeof o === 'undefined') o = true;

  switch (o) {
    case true:
      date[2]++;
      if (0 < date[2] && date[2] < 29) break;
      switch (date[2]) {
        case 32:
          date[1]++;
          date[2] = 1;
          if (date[1] == 12) date[0]++;
          break;
        case 31:
          switch (date[1]) {
            case 2:
            case 4:
            case 6:
            case 9:
            case 11:
              date[1]++;
              date[2] = 1;
          }
          break;
        case 30:
          if (date[1] != 2) break;
          date[1]++;
          date[2] = 1;
          break;
        case 29:
          if (date[1] != 2) break;
          if (date[1] % 400 == 0) break;
          if (date[1] % 4 == 0 || date[1] % 100 != 0) break;
          date[1]++;
          date[2] = 1;
          break;
      }
      break;

    case false:
      date[2]--;
      if (date[2] > 0) break;
      switch (date[1] - 1) {
        case 0:
          date[0]--;
          date[1] = 12;
          date[2] = 31;
          break;
        case 4:
        case 6:
        case 9:
        case 11:
          date[1]--;
          date[2] = 30;
          break;
        case 2:
          date[1]--;
          date[2] = 28;
          if (date[1] % 400 == 0) break;
          if (date[1] % 4 == 0 || date[1] % 100 != 0) break;
          date[2] = 29;
          break;
        default:
          date[1]--;
          date[2] = 31;
      }
      break;
  }

  return date;
}


/**
 * encodeArrayDate()
 * 文字列の日付を配列に変換
 * 変換出来ない場合、falseを返す
 * 
 * @param {String} v
 * @returns {Array|Boolean}
 */

var encodeArrayDate = function(v) {

  format = v.match(/([0-9]{4})-([0-9]{2})-([0-9]{2})/g);
  if (!format) return false;

  v = v.replace(/-0/g , '-') ;
  v = v.split('-');

  dt = new Date(v[0], v[1] - 1, v[2]);
  if (dt.getFullYear() != v[0] || dt.getMonth() != v[1] - 1 || dt.getDate() != v[2]) return false;

  return v;

}


/**
 * decodeArrayDate()
 * 配列の日付を文字列に変換
 * 変換出来ない場合、falseを返す
 * 
 * @param {Array} v
 * @param {String} p 区切り文字
 * @param {Boolean} w 曜日の有無
 * @returns {String|Boolean}
 */

var decodeArrayDate = function(v, p, w) {

  weekDayList = ['日', '月', '火', '水', '木', '金', '土'];

  if (typeof p === 'undefined') w = '-';
  if (typeof w === 'undefined') w = false;

  dt = new Date(v[0], v[1] - 1, v[2]);
  if (dt.getFullYear() != v[0] || dt.getMonth() != v[1] - 1 || dt.getDate() != v[2]) return false;

  str = '';
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
 * encodeTimezone()
 * タイムゾーンの形式を変換する
 * 
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
app.draw();
