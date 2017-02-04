<?php

require_once "TokyoMetroDelay.php";

$param = array(
    "action" => "set",
    "from" => "now"
);

new TokyoMetroDelay($param);

$hour = (int)date("G");
if (0 <= $hour % 30 && $hour % 30 < 7) {
    $param["from"] = "log";
    new TokyoMetroDelay($param);
}
