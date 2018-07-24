<?php

    $viewBag['title'] = "Вакансии и курсы «УчетАнализАудит»: бухгалтерские услуги, анализ, оптимизация в Гомеле";

    $viewBag["view"] = "career";
    $viewBag["bodyPadding"] = true;

    $viewBag["scripts"] = array(
        "yandex-map/yandex-map.js",
        "validator/js/validator.js"
    );

	$viewBag['elements'] = array(
        array("name" => "scrolled-navbar", "scripts" => false),
        array("name" => "career"),
        array("name" => "course"),
        array("name" => "yandex"),
        array("name" => "prefooter"),
        array("name" => "footer"),
	);


	
	