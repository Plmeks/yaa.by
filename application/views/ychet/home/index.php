<?php

	$viewBag['title'] = "Главная «УчетАнализАудит»: бухгалтерские услуги, анализ, оптимизация в Гомеле";

    $viewBag["view"] = "home";

    $viewBag["scripts"] = array(
        "parallax/parallax.min.js",
        "owl.carousel/owl.carousel.js",
        "yandex-map/yandex-map.js",
        "validator/js/validator.js"
    );

    $viewBag["css"] = array(
        "animate/animate.css",
        "owl.carousel/assets/owl.carousel.css"
    );

	$viewBag['elements'] = array(
		array("name" => "navbar"),
        array("name" => "scrolled-navbar"),
        array("name" => "landing"),
        array("name" => "about"),
        array("name" => "services"),
        array("name" => "advantages"),
        array("name" => "contact"),
        array("name" => "countClients"),
        array("name" => "reviews"),
        array("name" => "yandex"),
        array("name" => "prefooter"),
        array("name" => "footer"),
	);


	
	