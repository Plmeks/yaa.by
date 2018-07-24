<?php

$viewBag['title'] = "О компании «УчетАнализАудит»: бухгалтерские услуги, анализ, оптимизация в Гомеле";

    $viewBag["view"] = "about";
    $viewBag["bodyPadding"] = true;

    $viewBag["scripts"] = array(
        "yandex-map/yandex-map.js",
        "validator/js/validator.js"
    );


	$viewBag['elements'] = array(
		array("name" => "scrolled-navbar", "scripts" => false),
        array("name" => "detailServices"),
        array("name" => "advantages"),
        array("name" => "yandex"),
        array("name" => "prefooter"),
        array("name" => "footer"),
	);


	
	