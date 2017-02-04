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
        $this->firebase = new \Firebase\FirebaseLib(FIREBASE_URL, FIREBASE_TOKEN);

        $this->time = array(
            "year"     => (string)date("Y", strtotime("-4 hour")),
            "month"    => (string)date("m", strtotime("-4 hour")),
            "date"     => (string)date("d", strtotime("-4 hour")),
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

        if      ( 4 <= $hour && $hour <  7)
            return "a";
        else if ( 7 <= $hour && $hour < 10)
            return "b";
        else if (10 <= $hour && $hour < 17)
            return "c";
        else if (17 <= $hour || $hour <  4)
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
        $this->setFromNow();
        $this->setFromLog();
    }


    /**
     * NowデータをFirebaseにセット
     * @return array
     */
    private function setFromNow()
    {
        $findData = array(
            "date" => $this->dateArrayToSrting($this->time),
            "@type" => "now",
            "timezone" => $this->time["timezone"]
        );
        $data = $this->findFirebaseData($findData);

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
    }


    /**
     * LogデータをFirebaseにセット
     * @return array
     */
    private function setFromLog()
    {
        $prevTime = $this->getPrevTime($this->time);
        $findData = array(
            "date" => $this->dateArrayToSrting($prevTime),
            "timezone" => $prevTime["timezone"]
        );
        $data = $this->findFirebaseData($findData);

        $delayLine = array();
        foreach ($this->lines as $line) {
            $delayLine[$line] = $this->getCertificateData($line, $prevTime);
        }
        
        $this->updateLineDelayLog($data, $delayLine);
    }


    /**
     * データを検索
     * @param array 連想配列を指定 この１番最初の項目でデータを取得し、残りの項目でフィルターする
     * @return mixed
     */
    private function findFirebaseData($array)
    {
        $first_key   = key($array);
        $first_value = $array[key($array)];

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

                    return $extract;
                }

                $i++;
            }
        }

        $this->pushFirebaseData("", $array);

        return $this->findFirebaseData($array);
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
}
