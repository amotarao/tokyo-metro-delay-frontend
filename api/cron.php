<?php

require_once "TokyoMetroDelay.php";

$param = array(
    "action" => "set",
    "from" => "now"
);

new TokyoMetroDelay($param);


$minute = (int)date("i");

if (0 == $minute % 5) {

    $param = array(
        "action" => "set",
        "from" => "log"
    );

    new TokyoMetroDelay($param);
}
