<?php

ini_set( "display_errors", 1 );
error_reporting(E_ALL);

require_once __DIR__ . '/firebase-php/src/firebaseLib.php';
require_once __DIR__ . '/firebase-php/src/firebaseStub.php';

define('FIREBASE_URL', 'https://tokyometrodelay.firebaseio.com/');
define('FIREBASE_PATH', "/data_v1");
define('FIREBASE_TOKEN', json_decode(file_get_contents('./token.json'), true)["firebase"]);
define('OPENDATA_KEY', json_decode(file_get_contents('./token.json'), true)["opendata"]);

date_default_timezone_set("Asia/Tokyo");

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

    public function __construct($param = null)
    {
        // 深夜帯は終了
        $hour = (int)date("G");
        if (1 <= $hour && $hour < 5) {
            header("HTTP/1.0 403 Forbidden");
            exit;
        }


        $this->firebase = new \Firebase\FirebaseLib(FIREBASE_URL, FIREBASE_TOKEN);

        $this->time = array(
            "year"     => (string)date("Y", strtotime("-3 hour")),
            "month"    => (string)date("m", strtotime("-3 hour")),
            "date"     => (string)date("d", strtotime("-3 hour")),
            "timezone" => (string)$this->getTimezone()
        );

        $this->param = (!empty($_GET)) ? $_GET : $param;

        $action = (isset($this->param["action"])) ? $this->param["action"] . "Action" : "setAction";

        // actionが見当たらない場合、404
        if (!method_exists($this, $action)) {
            header("HTTP/1.0 404 Not Found");
            exit;
        }
        
        $this->$action();
    }


    /**
     * タイムゾーンを返す
     * @return string
     */
    private function getTimezone($time = null)
    {
        $hour = ($time !== null) ? (int)date("G", $time) : (int)date("G");

        if      ( 3 <= $hour && $hour <  7)
            return "a";
        else if ( 7 <= $hour && $hour < 10)
            return "b";
        else if (10 <= $hour && $hour < 17)
            return "c";
        else if (17 <= $hour || $hour <  3)
            return "d";

        return false;
    }


    /**
     * １つ前のタイムゾーンを返す
     * @param array
     * @return array
     */
    private function getPrevTime($time)
    {
        switch ($time["timezone"]) {
            case "d":
                $time["timezone"] = "c";
                return $time;
            case "c":
                $time["timezone"] = "b";
                return $time;
            case "b":
                $time["timezone"] = "a";
                return $time;
            case "a":
                $time["timezone"] = "d";

                $year  = $time["year"];
                $month = $time["month"];
                $date  = $time["date"];

                $date = strtotime("-1 day", strtotime("{$year}/{$month}/{$date} 00:00:00"));
                $time["year"]  = (string)date("Y", $date);
                $time["month"] = (string)date("m", $date);
                $time["date"]  = (string)date("d", $date);

                return $time;
        }
    }


    /**
     * 配列日付を文字列にして返す
     * @param array
     * @return string
     */
    private function dateArrayToSrting($date)
    {
        return $date["year"] . "-" . $date["month"] . "-" . $date["date"];
    }


    /**
     * タイムゾーンを変換する
     * @param string
     * @return string
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
     * データのSET
     */
    private function setAction()
    {
        if (isset($this->param["from"])) {
            if (strpos($this->param["from"], "now") !== false) {
                $this->setFromNow();
            }
            if (strpos($this->param["from"], "log") !== false) {
                $this->setFromLog();
            }
        }
    }


    /**
     * NowデータをFirebaseにセット
     */
    private function setFromNow()
    {
        $findData = array(
            "date" => $this->dateArrayToSrting($this->time),
            "@type" => "now",
            "timezone" => $this->time["timezone"]
        );
        $data = $this->findFirebaseData($findData, true);

        $contents = $this->getOpendataData("&rdf:type=odpt:Train");
        $delayLine = array();

        foreach ($this->lines as $line) {
            $delayTime = 0;

            foreach ($contents as $c) {
                if ($c["odpt:railway"] !== "odpt.Railway:TokyoMetro.". ucfirst($line)) continue;
                $delayTime = ($c["odpt:delay"] > $delayTime) ? $c["odpt:delay"] : $delayTime;
            }
            $delayLine[$line] = $delayTime / 60;
        }

        $this->updateLineDelayNow($data, $delayLine);

//        // TEST
//        $this->pushFirebaseLogData("/now", $delayLine);
    }


    /**
     * LogデータをFirebaseにセット
     */
    private function setFromLog()
    {
        $prevTime = $this->getPrevTime($this->time);

        // 既に存在するかどうかを確認 ある場合は終了
        $findData = array(
            "date" => $this->dateArrayToSrting($prevTime),
            "timezone" => $prevTime["timezone"],
            "@type" => "log"
        );
        $exist_log = $this->findFirebaseData($findData, false);

        if ($exist_log !== false) {
            return false;
        }

        // 遅延証データが存在するかどうかを確認 無い場合は終了
        $exist = $this->existCertificateData($prevTime);
        if ($exist !== true) {
            // TEST
            if ($exist % 9 != 0) {
                $this->pushFirebaseLogData("/exist_data", $exist);
            }
            return false;
        }

        // 挿入するデータを検索、指定
        $findData = array(
            "date" => $this->dateArrayToSrting($prevTime),
            "timezone" => $prevTime["timezone"],
            "@type" => "now"
        );
        $data = $this->findFirebaseData($findData, true);

        $delayLine = array();
        foreach ($this->lines as $line) {
            $delayLine[$line] = $this->getCertificateData($line, $prevTime);
        }
        
        $this->updateLineDelayLog($data, $delayLine);

        // TEST
        $this->pushFirebaseLogData("/log", $delayLine);
    }


    /**
     * データを検索
     * @param array 連想配列を指定 この１番最初の項目でデータを取得し、残りの項目でフィルターする
     * @param bool trueの場合、作成
     * @return mixed
     */
    private function findFirebaseData($array, $make)
    {
        $first_key   = key($array);
        $first_value = $array[key($array)];
        $extracts    = array();

        $data = $this->getFirebaseData("", array('orderBy' => '"'.$first_key.'"', 'equalTo' => '"'.$first_value.'"'));

        if ($data) {

            $i = 0;

            foreach ($data as $d) {
                $tmp = array_intersect_assoc($array, $d);
                $diff = array_diff_assoc($array, $tmp);

                if (empty($diff)) {
                    $extract = array(
                        array_keys($data)[$i] => $d
                    );
                    array_push($extracts, $extract);
                }

                $i++;
            }
        }

        // データがある場合、データが複数無いかどうか確認
        // 複数有る場合は、エラーデータを削除
        // データを返す
        if (!empty($extracts)) {

            if (count($extracts) > 1) {
                $i = 0;
                foreach ($extracts as $e) {
                    $i++;
                    if ($i == 1) continue;

                    $key = key($e);
                    $this->deleteFirebaseDataFromKey("/{$key}");
                }
            }

            return $extracts[0];
        }

        if ($make === true) {
            $this->pushFirebaseData("", $array);
            return $this->findFirebaseData($array, $make);
        }

        return false;
    }


    /**
     * 遅延時分をアップデート
     * @param array 元から入っていたデータ
     * @param array 遅延データ
     */
    private function updateLineDelayNow($delayData, $delayLine)
    {
        $key = key($delayData);
        $update = array();

        foreach ($this->lines as $line) {

            // 既に入っていたデータ
            if (isset($delayData[$key]["line"][$line])) {
                $exists = $delayData[$key]["line"][$line];
            } else {
                $exists = array();
            }

            // これから入れるデータ
            if (!isset($delayData[$key]["line"][$line]["delay_max"])) {
                $tmp = array(
                    "delay"     => $delayLine[$line],
                    "delay_max" => $delayLine[$line]
                );
            } else if ($delayData[$key]["line"][$line]["delay_max"] < $delayLine[$line]) {
                $tmp = array(
                    "delay"     => $delayLine[$line],
                    "delay_max" => $delayLine[$line]
                );
            } else {
                $tmp = array(
                    "delay"     => $delayLine[$line]
                );
            }

            $update[$line] = array_merge($exists, $tmp);
        }

        $this->updateFirebaseData("/{$key}/line", $update);
    }


    /**
     * 遅延証データをアップデート
     * @param array 元から入っていたデータ
     * @param array 遅延データ
     */
    private function updateLineDelayLog($delayData, $delayLine)
    {
        $key = key($delayData);
        $update = array();

        foreach ($this->lines as $line) {

            // 既に入っていたデータ
            if (isset($delayData[$key]["line"][$line])) {
                $exists = $delayData[$key]["line"][$line];
            } else {
                $exists = array();
            }

            // これから入れるデータ
            $tmp = array(
                "certificate" => $delayLine[$line]
            );

            $update[$line] = array_merge($exists, $tmp);
        }

        $this->updateFirebaseData("/{$key}/line", $update);
        $this->updateFirebaseData("/{$key}", array("@type"=>"log"));
    }


    /**
     * FirebaseにデータをUpdate
     * @param string
     * @param array
     */
    private function updateFirebaseData($path, $data) {
        $this->firebase->update(FIREBASE_PATH . $path, $data);
    }


    /**
     * FirebaseにデータをPush
     * @param string
     * @param array
     */
    private function pushFirebaseData($path, $data) {
        $this->firebase->push(FIREBASE_PATH . $path, $data);
    }


    /**
     * FirebaseにログデータをPush
     * @param string
     * @param array
     */
    private function pushFirebaseLogData($path, $data) {
        $path = "_log" . $path;
        $logdata = array(
            "_timestamp" => date("c"),
            "data" => $data
        );
        $this->pushFirebaseData($path, $logdata);
    }


    /**
     * FirebaseからデータをGet
     * @param string
     * @param array
     * @return mixed
     */
    private function getFirebaseData($path, $query) {
        $data = $this->firebase->get(FIREBASE_PATH . $path, $query);
        $data = json_decode($data, true);

        if (!empty($data)) {
            return $data;
        }

        return false;
    }


    /**
     * FirebaseのデータをDelete
     * @param string
     * @param string key
     * @return mixed
     */
    private function deleteFirebaseDataFromKey($path) {
        $this->firebase->delete(FIREBASE_PATH . $path);
    }


    /**
     * OpendataからデータをGet
     * @param string
     * @return mixed
     */
    private function getOpendataData($param) {
        $request = "https://api.tokyometroapp.jp/api/v2/datapoints?acl:consumerKey=" . OPENDATA_KEY . $param;
        $json = file_get_contents($request);
        $data = json_decode($json, true);

        if (!empty($data)) {
            return $data;
        }

        return false;
    }


    /**
     * 公式から遅延証データをGet
     * @param string
     * @param array
     * @return int
     */

    private function getCertificateData($line, $time)
    {
        $year  = $time["year"];
        $month = $time["month"];
        $date  = $time["date"];
        $date = date("Ymd", strtotime("{$year}/{$month}/{$date} 00:00:00"));
        $timezone = $this->encodeTimezone($time["timezone"]);
        $url = "http://www.tokyometro.jp/delay/detail/{$date}/{$line}_{$timezone}.shtml";
        $context = stream_context_create(array(
            "http" => array("ignore_errors" => true)
        ));
        $response = file_get_contents($url, false, $context);

        preg_match("/HTTP\/1\.[0|1|x] ([0-9]{3})/", $http_response_header[0], $matches);
        $status_code = $matches[1];

        switch ($status_code) {
            case "200":
                $delay = $this->getCertificateDetail($response);
                return $delay;
            case "404":
            default   :
                return 0;
        }
    }


    /**
     * 遅延時分を抽出
     * @param string
     * @return int
     */

    private function getCertificateDetail($contents)
    {
        preg_match('/<ul class="v2_BoxTxt">(.*)<!-- \/ \.v2_BoxTxt --><\/ul>/s', $contents, $matches);
        preg_match_all("/<[^>]*>([^<]*)/s", $matches[1], $matches);
        $text = preg_replace(array("/^.*の列車が/", "/遅れた.*$/"), "", $matches[1][5]);
        $delay = (int)preg_replace('/[^0-9]/', '', $text);

        return $delay;
    }


    /**
     * 遅延証データが存在するか確認
     * @param array
     * @return mixed
     */

    private function existCertificateData($time)
    {
        $timezone = $time["timezone"];
        $count_all = 0;

        $delay_text = array(
            "遅延なし",
            "5分程度の遅延",
            "10分程度の遅延",
            "15分程度の遅延",
            "20分程度の遅延",
            "25分程度の遅延",
            "30分程度の遅延",
            "35分程度の遅延",
            "40分程度の遅延",
            "45分程度の遅延",
            "50分程度の遅延",
            "55分程度の遅延",
            "60分程度の遅延",
            "61分以上の遅延"
        );

        foreach ($this->lines as $line) {

            $contents = file_get_contents("http://www.tokyometro.jp/delay/history/{$line}.html");
            $contents = str_replace('<!--  <p>遅延証明書<br class="v2_showPc">（15分程度の遅延）</p>  -->', "", $contents);
            $a=preg_match('/<div class="v2_mt0 v2_headingH3">(.*)<div class="v2_headingH3">/s', $contents, $matches);
            str_replace($delay_text, "", $matches[1], $count);

            $count_all += $count;

            if ($timezone == "d" && $count == 0) continue;
            if ($timezone == "a" && $count == 1) continue;
            if ($timezone == "b" && $count == 2) continue;
            if ($timezone == "c" && $count == 3) continue;
            if ($timezone == "d" && $count == 4) continue;

            return $count_all;
        }

        return true;
    }
}
