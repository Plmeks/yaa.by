<?php

$viewBag['title'] = "Отзывы «УчетАнализАудит»: бухгалтерские услуги, анализ, оптимизация в Гомеле";

    $viewBag["view"] = "reviews";
    $viewBag["bodyPadding"] = true;

    $viewBag["scripts"] = array(
        "owl.carousel/owl.carousel.js",
        "yandex-map/yandex-map.js",
        "validator/js/validator.js"
    );

    $viewBag["css"] = array(
        "owl.carousel/assets/owl.carousel.css"
    );


	$viewBag['elements'] = array(
		array("name" => "scrolled-navbar", "scripts" => false),
        array("name" => "alwaysWithYou"),
        array("name" => "reviews"),
        array("name" => "yandex"),
        array("name" => "prefooter"),
        array("name" => "footer"),
	);


	
	