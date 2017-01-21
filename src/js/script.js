var timeZoneBorder1 = 4;
var timeZoneBorder2 = 7;
var timeZoneBorder3 = 10;
var timeZoneBorder4 = 17;
var timeAdjustment = 5 * 60 * 1000;
var timeDifference = 9;
var nowDate = new Date();
var weekDayList = ["日", "月", "火", "水", "木", "金", "土"];

var dateStringToDate = function(v) {
  var year = v.substr(0, 4);
  var month = v.substr(4, 2);
  var day = v.substr(6, 2);
  var date = new Date(month + '/' + day + '/' + year);
  return date;
}


var dateDateToString = function(v) {
  var dateStr = String(v.getFullYear());
  if (v.getMonth() + 1 < 10) dateStr += "0";
  dateStr += String(nowDate.getMonth() + 1);
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
  var b = (b !== undefined) ? b : nowDate;
  var division = Math.ceil((a.getTime() - b.getTime()) / 1000 / 60 / 60 / 24);
  return division;
}


var addDate = function(a, b) {
  var date = a.getTime() + b * 24 * 60 * 60 * 1000;
  var dateObj = new Date(date);
  return dateObj;
}


var delayTextToSimple = function(v) {
  if (v.substr(0, 2) == '最大') {
    return '+' + v.substr(2, 3);
  } else {
    return '61+分';
  }
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
  this.setDate();
  this.setTimeZone();
  this.setDocumentSelecter();
  this.initDraw();

  this.loading = true;
  this.data = JSON.parse('{"' + dateDateToString(nowDate) + '":{"' + this.currentTimeZone + '":{"delayLine":[],"delayLineDetail":[]}}}');
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
  this._listWrap = document.querySelector('.top-wrap');
  this._list = document.querySelector('.line-list');
  this._loader = document.querySelector('.line-loader');
  this._lineInfo = document.querySelector('.line-information');
  this._selectDate = document.querySelector('.select-date .current');
  this._selectTime = document.querySelector('.select-time .current');
}


/**
 * setDate()
 *
 * 選択する日付をセットする
 * Make: this.dateDifference
 */

TokyoMetroDelay.prototype.setDate = function() {
  var dateStr = dateDateToString(nowDate);
  var paramDate = getUrlVars().date;

  if (typeof paramDate === "undefined") {
    this.dateDifference = 0;
  } else {
    this.dateDifference = divisionDate(dateStringToDate(paramDate));
  }
}


/**
 * setTimeZone()
 *
 * 選択する時間帯をセットする
 * Make: this.currentTimeZone
 */

TokyoMetroDelay.prototype.setTimeZone = function() {
  var compareTime = (nowDate - timeAdjustment + timeDifference * 60 * 60 * 1000) % 86400000 / 3600000;
  if (timeZoneBorder1 <= compareTime && compareTime < timeZoneBorder2) var timeZone = 'a';
  else if (timeZoneBorder2 <= compareTime && compareTime < timeZoneBorder3) var timeZone = 'b';
  else if (timeZoneBorder3 <= compareTime && compareTime < timeZoneBorder4) var timeZone = 'c';
  else if (timeZoneBorder4 <= compareTime || compareTime < timeZoneBorder1) var timeZone = 'd';

  if (compareTime < timeZoneBorder1) this.dateDifference = -1;

  var paramTimeZone = getUrlVars().timeZone;

  if (typeof paramTimeZone === "undefined") {
    this.currentTimeZone = timeZone;
  } else {
    this.currentTimeZone = paramTimeZone;
  }
}


/**
 * setPreviousTimeZone()
 *
 * 前の時間帯にセット
 */

TokyoMetroDelay.prototype.setPreviousTimeZone = function() {
  switch (this.currentTimeZone) {
    case 'a':
      this.currentTimeZone = 'd';
      this.dateDifference--;
      this.drawCurrentDate();
      break;
    case 'b':
      this.currentTimeZone = 'a';
      break;
    case 'c':
      this.currentTimeZone = 'b';
      break;
    case 'd':
      this.currentTimeZone = 'c';
      break;
  }
  this.setDelayLine();
  this.drawCurrentTimeZone();
}


/**
 * setNextTimeZone()
 *
 * 次の時間帯にセット
 */

TokyoMetroDelay.prototype.setNextTimeZone = function() {
  switch (this.currentTimeZone) {
    case 'a':
      this.currentTimeZone = 'b';
      break;
    case 'b':
      this.currentTimeZone = 'c';
      break;
    case 'c':
      this.currentTimeZone = 'd';
      break;
    case 'd':
      this.currentTimeZone = 'a';
      this.dateDifference++;
      this.drawCurrentDate();
      break;
  }
  this.setDelayLine();
  this.drawCurrentTimeZone();
}


/**
 * setDelayLine()
 *
 * 選択している時間帯の遅延路線をセットする
 * Make:
 */

TokyoMetroDelay.prototype.setDelayLine = function() {
  var date = dateDateToString(addDate(nowDate, this.dateDifference));

  this.currentData = false;
  this.currentDataDetail = false;

  if (date in this.data) {
    if (this.currentTimeZone in this.data[date]) {
      this.currentData = this.data[date][this.currentTimeZone]['delayLine'];
      this.currentDataDetail = this.data[date][this.currentTimeZone]['delayLineDetail'];
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
  this.drawCurrentTimeZone();
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
  this._list.classList.remove('line-list--count_' + document.querySelectorAll('.line-delay').length);
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
    this._list.classList.add('line-list--count_' + this.currentData.length);
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
  var d = addDate(nowDate, this.dateDifference);
  var year = d.getFullYear();
  var month = d.getMonth() + 1;
  var day = d.getDate();
  var weekDay = weekDayList[d.getDay()];

  this._selectDate.innerHTML = year + '.' + month + '.' + day + ' ' + weekDay;
}


/**
 * drawCurrentTimeZone()
 *
 * 選択中の時間帯を描画
 */

TokyoMetroDelay.prototype.drawCurrentTimeZone = function() {
  var time;

  switch (this.currentTimeZone) {
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

document.getElementById("previousTimeZone").addEventListener("click", function(event) {
  app.setPreviousTimeZone();
  app.draw();
}, false);
document.getElementById("nextTimeZone").addEventListener("click", function(event) {
  app.setNextTimeZone();
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
    app.setNextTimeZone();
    app.draw();
  } else if (direction == 'left') {
    app.setPreviousTimeZone();
    app.draw();
  }
}, false);
