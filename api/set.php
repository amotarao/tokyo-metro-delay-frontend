<?php

$lines = array(
    'ginza',
    'marunouchi',
    'hibiya',
    'tozai',
    'chiyoda',
    'yurakucho',
    'hanzomon',
    'namboku',
    'fukutoshin'
);

if (isset($_GET['date'])) {
    $date = $_GET['date'];
} else {
    $date = date("Ymd");
}

if (isset($_GET['timeZone'])) {
    $timeZone = $_GET['timeZone'];
    switch ($timeZone) {
        case 'a':
            $timeZone = '1';
            break;
        case 'b':
            $timeZone = '2';
            break;
        case 'c':
            $timeZone = '3';
            break;
        case 'd':
            $timeZone = '4';
            break;
        default:
            $timeZone = '1';
            break;
    }
} else {
    $timestamp = strtotime( "-5 minute" );
    $hour = ($timestamp / 60 / 60 + 9) % 24;

    if (4 <= $hour && $hour < 7) {
        $timeZone = '1';
    } else if (7 <= $hour && $hour < 10) {
        $timeZone = '2';
    } else if (10 <= $hour && $hour < 17) {
        $timeZone = '3';
    } else if (17 <= $hour) {
        $timeZone = '4';
    } else {
        $date = date("Ymd", strtotime("-1 day", $date));
        $timeZone = '4';
    }
}

foreach ($lines as $line):

$result = getCertificateData($date, $line, $timeZone);
mkdir("./data/{$date}-{$timeZone}");
file_put_contents("./data/{$date}-{$timeZone}/{$line}.txt", $result);

endforeach;


/**
 * getCertificateData()
 *
 * 遅延証データを取得する
 */

function getCertificateData($date, $line, $timezone) {
    // http://www.tokyometro.jp/delay/detail/20170106/ginza_3.shtml
    $url = "http://www.tokyometro.jp/delay/detail/{$date}/{$line}_{$timezone}.shtml";

    $context = stream_context_create(array(
        'http' => array('ignore_errors' => true)
    ));
    $response = file_get_contents($url, false, $context);

    preg_match('/HTTP\/1\.[0|1|x] ([0-9]{3})/', $http_response_header[0], $matches);
    $status_code = $matches[1];

    switch ($status_code) {
        case '200':
            $data = getCertificateDetail($date, $line, $timezone);
            return $data;
        case '404':
            return null;
        default:
            return false;
    }
}



/**
 * getCertificateDetail()
 * 遅延証データ(詳細)を取得する
 */

/* 
// サンプル
        <ul class="v2_BoxTxt">
          <li>
            <div class="v2_headingH1 v2_mt0">
              <h2 class="v2_headingH1Title">遅延証明書</h2>
            </div>
            <p>2017年01月07日（土曜日）始発から7時までの間、日比谷線の列車が最大10分程度遅れたことを証明いたします。<br>ご迷惑をおかけし、誠に申し訳ございませんでした。</p>
            <p class="v2_txtR">2017年01月07日
<br>東京地下鉄株式会社</p>
          </li>
        <!-- / .v2_BoxTxt --></ul>
*/

$tempData = "";

function getCertificateDetail($date, $line, $timezone) {
    $url = "http://www.tokyometro.jp/delay/detail/{$date}/{$line}_{$timezone}.shtml";
    $response = file_get_contents($url);
    preg_match('/<ul class="v2_BoxTxt">(.*)<!-- \/ \.v2_BoxTxt --><\/ul>/s', $response, $matches);
    preg_match_all('/<[^>]*>([^<]*)/s', $matches[1], $matches);

    $detail = array(
        'title'      => $matches[1][2],
        'line'       => $line,
        'line_ja'    => extractLineName($matches[1][5]),
        'date'       => strtotime(str_replace(array('年', '月', '日'), '', to1Line($matches[1][8]))),
        'date_str'   => to1Line($matches[1][8]),
        'delay_time' => extractDelayTime($matches[1][5]),
        'time_start' => "",
        'time_end'   => "",
        'text'       => $matches[1][5] . PHP_EOL . $matches[1][6],
//        'signature' => $matches[1][9]
    );

    return $detail['delay_time'];

//    preg_match('/<\/ul>/', $response, $matches);
//    var_dump($matches);
    var_dump($detail);
    // return $response;
    
}

function to1Line($str) {
    return str_replace(array("\r\n", "\r", "\n"), '', $str);
}
function extractLineName($v) {
    return preg_replace(array("/^.*までの間、/", "/の列車が.*$/"), "", $v);
}
function extractDelayTime($v) {
    return preg_replace(array("/^.*の列車が/", "/遅れた.*$/"), "", $v);
}
