<?php
    ini_set("display_errors", 1);
    define("URL", "http://" .$_SERVER['SERVER_NAME']. "/");
    define("BUILD", false);
    define("PROJECT", "ychet");
	include_once "application/mvc_start.php";