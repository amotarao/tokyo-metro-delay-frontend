<?php

ini_set( "display_errors", 1 );
error_reporting(E_ALL);

class TokyoMetroDelay
{
    private $lines = array(
        "ginza",
        "marunouchi",
        "hibiya",
        "tozai",
        "chiyoda",
        "yurakucho",
        "hanzomon",
        "namboku",
        "fukutoshin"
    );
    private $consumerKey = "b2f2be193b3039b72fae8f818883994f1e37b2257c16d0624683d6bf626f634f";

    public function __construct($param = null)
    {
        $this->param = ($param !== null) ? $param : $_GET;
        
        if (isset($this->param["action"])) {
            $action = h($this->param["action"]) . "Action";
        } else {
            $url = (empty($_SERVER["HTTPS"]) ? "http://" : "https://") . $_SERVER["HTTP_HOST"] . $_SERVER["REQUEST_URI"];
            $request = explode("/", parse_url($url, PHP_URL_PATH));
            $action = $request[2] . "Action";
        }

        if (method_exists($this, $action)) {
            $this->$action();
        } else {
            header("HTTP/1.0 404 Not Found");
            exit;
        }
    }

    private function setAction()
    {

        $hour = (strtotime("now") / 60 / 60 + 9) % 24;
        if (1 <= $hour && $hour < 4) return false;

        $date     = (isset($this->param["date"])     && $this->checkDate($this->param["date"]))         ? h($this->param["date"])                            : $this->setDate();
        $timezone = (isset($this->param["timezone"]) && $this->checkTimezone($this->param["timezone"])) ? $this->encodeTimezone(h($this->param["timezone"])) : $this->setTimezone();

        $certificate = $this->setFromCertificate($date, $timezone);
        $opendata    = $this->setFromOpendata();

        $array = array(
            "status" => "success",
            "data" => array(
                "set" => array(
                    "date" => date(DATE_ATOM),
                    "certificate" => $certificate,
                    "opendata" => $opendata
                )
            )
        );

        $this->dispJSON($array);
    }

    private function getAction()
    {

        $dirs = scandir("./data", SCANDIR_SORT_DESCENDING);
        $array = array();
        $i = 0;

        foreach ($dirs as $dir) {
            if ($dir == "." || $dir == ".." || $i >= 20) continue;

            $date = explode("-", $dir)[0];
            $timezone = explode("-", $dir)[1];
            switch ($timezone) {
                case "1":
                    $timezone = "a";
                    break;
                case "2":
                    $timezone = "b";
                    break;
                case "3":
                    $timezone = "c";
                    break;
                case "4":
                    $timezone = "d";
                    break;
            }

            $array[$date][$timezone]["delayLine"] = array();
            $array[$date][$timezone]["delayLineDetail"] = array();
            
            foreach ($this->lines as $line) {
                if (filesize("./data/{$dir}/{$line}.txt") > 0) {
                    $array[$date][$timezone]["delayLine"][] = $line;
                    $array[$date][$timezone]["delayLineDetail"][$line] = file_get_contents("./data/{$dir}/{$line}.txt");
                }
            }
            $i++;
        }

        $this->dispJSON($array);

    }


    /**
     * 遅延証明書ページからの取得
     * 
     * @return array
     */

    private function setFromCertificate($date, $timezone)
    {
        $data = array();

        foreach ($this->lines as $line) {

            $result = getCertificateData($date, $line, $timezone);
            if ( !file_exists("./data/{$date}-{$timezone}") ) mkdir("./data/{$date}-{$timezone}");
            file_put_contents("./data/{$date}-{$timezone}/{$line}.txt", $result);

            $data[] = array(
                "date" => $date,
                "timezone" => $this->decodeTimezone($timezone),
                "line" => $line,
                "text" => $result
            );

        }

        return $data;
    }


    /**
     * オープンデータからの取得
     * 
     * @return array
     */

    private function setFromOpendata()
    {
        $data = array();

        foreach ($this->lines as $line) {

            $request = "https://api.tokyometroapp.jp/api/v2/datapoints?acl:consumerKey=" . $this->consumerKey . "&rdf:type=odpt:Train&odpt:railway=odpt.Railway:TokyoMetro.". ucfirst($line);
            $json = file_get_contents($request);
            $contents = json_decode($json, true);
            $delay = 0;

            foreach ($contents as $c) {
                $delay_tmp = $c["odpt:delay"];
                if ($delay < $delay_tmp) $delay = $delay_tmp;
            }

            $data[] = array(
                "line" => $line,
                "delay" => $delay
            );

        }

        return $data;
    }


    /**
     * 入力された日付がフォーマット通りかチェックする
     * 
     * @return bool
     */

    private function checkDate($str)
    {
        $str = h($str);
        sscanf($str, "%4d%2d%2d", $year, $month, $day);

        if ($str == date("Ymd", strtotime("{$year}/{$month}/{$day} 00:00:00"))) return true;

        return false;
    }


    /**
     * 入力されたタイムゾーンがフォーマット通りかチェックする
     * 
     * @return bool
     */

    private function checkTimezone($str)
    {
        $str = h($str);

        switch ($str) {
            case "a":
            case "b":
            case "c":
            case "d":
                return true;
        }

        return false;
    }


    /**
     * 日付をセットする
     * 
     * @return string
     */

    private function setDate()
    {
        $hour = getHour("-5 minute");
        $date = (4 <= $hour) ? date("Ymd") : date("Ymd", strtotime("-1 day"));

        return $date;
    }


    /**
     * タイムゾーンをセットする
     * 
     * @return bool
     */

    private function setTimezone()
    {
        $hour = getHour("-5 minute");

        if      ( 4 <= $hour && $hour <  7) $timezone = "a";
        else if ( 7 <= $hour && $hour < 10) $timezone = "b";
        else if (10 <= $hour && $hour < 17) $timezone = "c";
        else if (17 <= $hour)               $timezone = "d";
        else                                $timezone = "d";

        return $this->encodeTimezone($timezone);
    }


    /**
     * タイムゾーンをエンコード
     * "a" => "1"
     */

    private function encodeTimezone($v)
    {
        switch ($v) {
            case "a":
                return "1";
            case "b":
                return "2";
            case "c":
                return "3";
            case "d":
                return "4";
        }
        return false;
    }


    /**
     * タイムゾーンをデコード
     * "1 => "a"
     */

    private function decodeTimezone($v)
    {
        switch ($v) {
            case "1":
                return "a";
            case "2":
                return "b";
            case "3":
                return "c";
            case "4":
                return "d";
        }
        return false;
    }


    /**
     * 配列をJSONに変換し出力する
     */

    private function dispJSON($array)
    {
        $json = json_encode( $array , JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES );
        header("Content-Type: application/json; charset=utf-8");
        echo $json;

        return true;
    }
}






/**
 * getCertificateData()
 *
 * 遅延証データを取得する
 */

function getCertificateData($date, $line, $timezone)
{
    // http://www.tokyometro.jp/delay/detail/20170106/ginza_3.shtml
    $url = "http://www.tokyometro.jp/delay/detail/{$date}/{$line}_{$timezone}.shtml";

    $context = stream_context_create(array(
        "http" => array("ignore_errors" => true)
    ));
    $response = file_get_contents($url, false, $context);

    preg_match("/HTTP\/1\.[0|1|x] ([0-9]{3})/", $http_response_header[0], $matches);
    $status_code = $matches[1];

    switch ($status_code) {
        case "200":
            $data = getCertificateDetail($date, $line, $timezone);
            return $data;
        case "404":
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

function getCertificateDetail($date, $line, $timezone)
{
    $url = "http://www.tokyometro.jp/delay/detail/{$date}/{$line}_{$timezone}.shtml";
    $response = file_get_contents($url);
    preg_match('/<ul class="v2_BoxTxt">(.*)<!-- \/ \.v2_BoxTxt --><\/ul>/s', $response, $matches);
    preg_match_all("/<[^>]*>([^<]*)/s", $matches[1], $matches);

    $detail = array(
        "title"      => $matches[1][2],
        "line"       => $line,
        "line_ja"    => extractLineName($matches[1][5]),
        "date"       => strtotime(str_replace(array("年", "月", "日"), "", to1Line($matches[1][8]))),
        "date_str"   => to1Line($matches[1][8]),
        "delay_time" => extractDelayTime($matches[1][5]),
        "time_start" => "",
        "time_end"   => "",
        "text"       => $matches[1][5] . PHP_EOL . $matches[1][6],
//        "signature" => $matches[1][9]
    );

    return $detail["delay_time"];

//    preg_match("/<\/ul>/", $response, $matches);
//    var_dump($matches);
    var_dump($detail);
    // return $response;
    
}

function to1Line($str) {
    return str_replace(array("\r\n", "\r", "\n"), "", $str);
}

function extractLineName($v) {
    return preg_replace(array("/^.*までの間、/", "/の列車が.*$/"), "", $v);
}

function extractDelayTime($v) {
    return preg_replace(array("/^.*の列車が/", "/遅れた.*$/"), "", $v);
}

function getHour($str = "now")
{
    return (strtotime( $str ) / 60 / 60 + 9) % 24;
}

function h($str)
{
    return htmlspecialchars($str, ENT_QUOTES, "UTF-8");
}
