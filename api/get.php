<?php

/*
$date       = paramToData('date', $tmp)             ? $tmp : date("Y-m-d");
$timezone   = paramToData('timezone', $tmp)         ? $tmp : null;
$count      = paramToData('count', $tmp)            ? $tmp : 3;
$countWay   = paramToData('countWay', $tmp, true)   ? $tmp : array('previos');
$line       = paramToData('line', $tmp, true)       ? $tmp : array('ginza','marunouchi','hibiya','tozai','chiyoda','yurakucho','hanzomon','namboku','fukutoshin');
$detailItem = paramToData('detailItem', $tmp, true) ? $tmp : array('delayTime');

function paramToData ($param, &$result, $is_array = false) {

    if (!isset($_GET[$param])) return false;
    $p = htmlspecialchars($_GET[$param], ENT_QUOTES, "utf-8");
    if ($is_array) $p = explode(",", $p);

    switch ($param) {
        case 'date' :
            if (!preg_match("/^([0-9]{4})\-([01]?[0-9])\-([0123]?[0-9])$/", $p, $matches)) return false;
            if (!checkdate($matches[2], $matches[3], $matches[1])) return false;
            if (strtotime(date("Y-m-d")) < strtotime($p)) return false;
            break;
        case 'dayCount' :
            if ($p < 0) return false;
            break;
        case 'dayCountWay' :
            foreach ($p as $v) {
                if ($v != 'previos' && $v != 'later') return false;
            }
            break;
        case 'line' :
            foreach ($p as $v) {
                if ($v == 'all') return false;
                if (!in_array($v, array('ginza','marunouchi','hibiya','tozai','chiyoda','yurakucho','hanzomon','namboku','fukutoshin'))) return false;
            }
            break;
        case 'detailItem' :
            foreach ($p as $v) {
                return false;
//                if (!in_array($v, array('delayTime'))) return false;
            }
            break;
        default :
            break;
    }

    $result = $p;
    return true;
}
*/


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

$dirs = scandir('./data', SCANDIR_SORT_DESCENDING);
$array = array();
$i = 0;

foreach ($dirs as $dir) {
    if ($dir == '.' || $dir == '..' || $i >= 10) continue;

    $date = explode('-', $dir)[0];
    $timezone = explode('-', $dir)[1];
    switch ($timezone) {
        case '1':
            $timezone = 'a';
            break;
        case '2':
            $timezone = 'b';
            break;
        case '3':
            $timezone = 'c';
            break;
        case '4':
            $timezone = 'd';
            break;
    }

    $array[$date][$timezone]['delayLine'] = array();
    $array[$date][$timezone]['delayLineDetail'] = array();
    
    foreach ($lines as $line) {
        if (filesize("./data/{$dir}/{$line}.txt") > 0) {
            $array[$date][$timezone]['delayLine'][] = $line;
            $array[$date][$timezone]['delayLineDetail'][$line] = file_get_contents("./data/{$dir}/{$line}.txt");
        }
    }
    $i++;
}

$json = json_encode( $array , JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES ) ;

header( 'Content-Type: application/json; charset=utf-8' ) ;
echo $json ;
