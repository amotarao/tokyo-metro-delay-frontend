<?php

require_once "TokyoMetroDelay.php";

$param = array(
    "action" => "set",
    "from" => "now,log"
);

new TokyoMetroDelay($param);
