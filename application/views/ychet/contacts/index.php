<?php

$viewBag['title'] = "Наши контакты «УчетАнализАудит»: бухгалтерские услуги, анализ, оптимизация в Гомеле";

    $viewBag["view"] = "contacts";
    $viewBag["bodyPadding"] = true;

    $viewBag["scripts"] = array(
        "yandex-map/yandex-map.js",
        "validator/js/validator.js"
    );


	$viewBag['elements'] = array(
		array("name" => "scrolled-navbar", "scripts" => false),
        array("name" => "contact"),
        array("name" => "yandex"),
        array("name" => "prefooter"),
        array("name" => "footer"),
	);


	
	