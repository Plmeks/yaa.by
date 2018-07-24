<?php

$viewBag['title'] = "Услуги «УчетАнализАудит»: бухгалтерские услуги, анализ, оптимизация в Гомеле";

    $viewBag["view"] = "services";
    $viewBag["bodyPadding"] = true;

    $viewBag["scripts"] = array(
        "parallax/parallax.min.js",
        "yandex-map/yandex-map.js",
        "validator/js/validator.js"
    );


	$viewBag['elements'] = array(
        array("name" => "scrolled-navbar", "scripts" => false),
        array("name" => "services"),
        array("name" => "yandex"),
        array("name" => "prefooter"),
        array("name" => "footer"),
	);


	
	