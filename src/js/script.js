var timezoneBorder = [4, 7, 10, 17];
var timeAdjustment = -5;
var weekDayList = ['日', '月', '火', '水', '木', '金', '土'];

var dateStringToDate = function(v) {
  var year = v.substr(0, 4);
  var month = v.substr(4, 2);
  var day = v.substr(6, 2);
  var date = new Date(month + '/' + day + '/' + year);
  return date;
}


var dateToString = function(v) {
  v = calcDate(v, -9, 'h');

  var dateStr = String(v.getFullYear());
  if (v.getMonth() + 1 < 10) dateStr += "0";
  dateStr += String(v.getMonth() + 1);
  if (v.getDate() < 10) dateStr += "0";
  dateStr += String(v.getDate());

  return dateStr;
}


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


var divisionDate = function(a, b) {
  var b = (b !== undefined) ? b : new Date();
  var division = Math.ceil((a.getTime() - b.getTime()) / 1000 / 60 / 60 / 24);
  return division;
}


var delayTextToSimple = function(v) {
  if (v.substr(0, 2) == '最大') {
    return '+' + v.substr(2, 3);
  } else {
    return '61+分';
  }
}


/**
 * getJPDate()
 * GMTを無視した日本の時刻を取得
 *
 * @return {number}
 */

var getJPDate = function() {
  date = new Date();
  date = calcDate(date, 9, 'h');
  return date;
}


/**
 * getTimezone()
 * 日付のタイムゾーンを取得
 * 
 * @param {number} date
 * @return {string}
 */

var getTimezone = function(date) {
  date = calcDate(date, 9, 'h');
  date = calcDate(date, timeAdjustment, 'm');
  date = date % 86400000 / 3600000;
  if      (timezoneBorder[0] <= date && date < timezoneBorder[1]) return 'a';
  else if (timezoneBorder[1] <= date && date < timezoneBorder[2]) return 'b';
  else if (timezoneBorder[2] <= date && date < timezoneBorder[3]) return 'c';
  else if (timezoneBorder[3] <= date || date < timezoneBorder[0]) return 'd';
}


/**
 * calcDate()
 * 日付を計算（相対の加減算なので時差関係なし）
 * 
 * @param {number} date
 * @param {number} diff
 * @param {string} unit
 * @return {number}
 */

var calcDate = function(date, diff, unit) {
  switch (unit) {
    case 'd':
      date.setDate(date.getDate() + diff);
    case 'h':
      date.setHours(date.getHours() + diff);
    case 'm':
      date.setMinutes(date.getMinutes() + diff);
  }
  return date;
}


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

  this.loading = true;
  this.data = JSON.parse('{"' + dateToString(this.currentDate) + '":{"' + this.selectTimezone + '":{"delayLine":[],"delayLineDetail":[]}}}');
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
  this._listWrap   = document.querySelector('.top-wrap');
  this._list       = document.querySelector('.list');
  this._loader     = document.querySelector('.line-loader');
  this._lineInfo   = document.querySelector('.line-information');
  this._selectDate = document.querySelector('.select-date .current');
  this._selectTime = document.querySelector('.select-time .current');
  this._controlNext = document.getElementById('nextTimezone');
}


/**
 * setCurrentTime()
 *
 * 現在の日付・時間帯をセットする
 */

TokyoMetroDelay.prototype.setCurrentTime = function() {
  date = getJPDate();
  this.currentDate = calcDate(date, -4, 'h');
  this.currentTimezone = getTimezone(date);
}


/**
 * setSelectDate()
 *
 * 選択する日付をセットする
 * Make: this.dateDifference
 */

TokyoMetroDelay.prototype.setSelectDate = function() {
  var dateStr = dateToString(this.currentDate);
  var paramDate = getUrlVars().date;

  if (typeof paramDate === "undefined") {
    this.dateDifference = 0;
  } else {
    this.dateDifference = divisionDate(dateStringToDate(paramDate));
  }
}


/**
 * setSelectTimezone()
 *
 * 選択する時間帯をセットする
 * Make: this.selectTimezone
 */

TokyoMetroDelay.prototype.setSelectTimezone = function() {
  date = getJPDate();
  date = calcDate(date, timeAdjustment, 'm');
  timezone = getTimezone(date);

  if (date.getHours() - timeAdjustment < timezoneBorder[0]) this.dateDifference = -1;

  var paramTimezone = getUrlVars().timezone;

  if (typeof paramTimezone === "undefined") {
    this.selectTimezone = timezone;
  } else {
    this.selectTimezone = paramTimezone;
  }
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
      this.dateDifference--;
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
      this.dateDifference++;
      this.drawCurrentDate();
      break;
  }
  this.setDelayLine();
  this.drawCurrentTimezone();
}


/**
 * setDelayLine()
 *
 * 選択している時間帯の遅延路線をセットする
 * Make:
 */

TokyoMetroDelay.prototype.setDelayLine = function() {
  var date = dateToString(calcDate(this.currentDate, this.dateDifference, 'd'));

  this.currentData = false;
  this.currentDataDetail = false;

  if (date in this.data) {
    if (this.selectTimezone in this.data[date]) {
      this.currentData = this.data[date][this.selectTimezone]['delayLine'];
      this.currentDataDetail = this.data[date][this.selectTimezone]['delayLineDetail'];
    }
  }
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
  var oldDelayLineCount = document.querySelectorAll('.line-delay').length;
  var delayLineCount = this.currentData.length;
  if (oldDelayLineCount == 0) var infoClass = this._lineInfo.querySelector('div div').classList[0];

  if (this.loading) { // ロード中
    this.drawInfo('loading');
    return true;
  }
  if (oldDelayLineCount == 0 && delayLineCount == 0) { // 変更前も変更後も 遅延路線なし
    this.drawInfo('scheduled');
    return true;
  }
  if (oldDelayLineCount == 0 && !this.currentData && (infoClass == 'line-nodata' || infoClass == 'line-scheduled' || infoClass == 'line-loader')) {
    this.drawInfo('nodata');
    return true;
  }

  this.drawInfo('null');
  this._list.classList.add('is-changing');

  this.drawDelayLine();

  var self = this;

  setTimeout(function() {
    self._list.classList.remove('is-changing');
  }, 300);
}


/**
 * drawDelayLine()
 *
 * 遅延路線にクラスをセット
 */

TokyoMetroDelay.prototype.drawDelayLine = function() {
  // 遅延路線リセット
  this._list.classList.remove('list--count_' + document.querySelectorAll('.line-delay').length);
  Array.prototype.forEach.call(this._list.querySelectorAll('.line-delay'), function(e) {
    e.classList.remove('line-delay');
  });
  var delay = document.querySelectorAll('.delay-text');
  Array.prototype.forEach.call(delay, function(node) {
    node.parentNode.removeChild(node);
  });

  // 遅延路線セット
  if (this.currentData.length > 0) {

    var self = this;
    this.currentData.forEach(function(line) {
      self._list.querySelector('li[data-line-name=' + line + ']').classList.add('line-delay');

      var ele = document.createElement('span');
      var str = document.createTextNode(delayTextToSimple(self.currentDataDetail[line]));
      ele.classList.add('delay-text');
      ele.appendChild(str);

      self._list.querySelector('li[data-line-name=' + line + '] .line-text').appendChild(document.createTextNode(' '));
      self._list.querySelector('li[data-line-name=' + line + '] .line-text').appendChild(ele);

    });
    this._list.classList.add('list--count_' + this.currentData.length);
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
  switch (v) {
    case 'null':
      this._lineInfo.innerHTML = '';
      break;

    case 'loading':
      this._lineInfo.innerHTML = '\
            <div class="line-loader">\
                <div class="loader"></div>\
                <p class="line-text">読み込み中</p>\
            </div>';
      break;

    case 'scheduled':
      this._lineInfo.innerHTML = '\
            <div class="line-scheduled">\
                <div class="ok-circle"></div>\
                <p class="line-text">時刻通り</p>\
            </div>';
      break;

    case 'nodata':
      this._lineInfo.innerHTML = '\
            <div class="line-nodata">\
                <div class="ok-circle"></div>\
                <p class="line-text">データなし</p>\
            </div>';
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
  var d = calcDate(this.currentDate, this.dateDifference, 'd');
  var year = d.getFullYear();
  var month = d.getMonth() + 1;
  var day = d.getDate();
  var weekDay = weekDayList[d.getDay()];

  this._selectDate.innerHTML = year + '.' + month + '.' + day + ' ' + weekDay;
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
  this._selectTime.innerHTML = time;
}


var app = new TokyoMetroDelay();
app.draw();

document.getElementById("previousTimezone").addEventListener("click", function(event) {
  app.setPreviousTimezone();
  app.draw();
}, false);
document.getElementById("nextTimezone").addEventListener("click", function(event) {
  app.setNextTimezone();
  app.draw();
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
    app.setNextTimezone();
    app.draw();
  } else if (direction == 'left') {
    app.setPreviousTimezone();
    app.draw();
  }
}, false);
setInterval(function() {
  app.setCurrentTime();
}, 300000);
