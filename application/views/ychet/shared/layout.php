<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no">

    <link rel="icon" type="image/png" href="<?php echo URL; ?>favicon.png"/>

    <title><?php echo $config['title'];?></title>

    <!-- Custom Fonts -->
    <link href='http://fonts.googleapis.com/css?family=Open+Sans:300italic,400italic,600italic,700italic,800italic,400,300,600,700,800' rel='stylesheet' type='text/css'>
    <link href='http://fonts.googleapis.com/css?family=Merriweather:400,300,300italic,400italic,700,700italic,900,900italic' rel='stylesheet' type='text/css'>


	<script type="text/javascript" src="<?php echo URL;?>scripts/frameworks/jquery/jquery.js"></script>

    <script type="text/javascript" src="<?php echo URL;?>scripts/frameworks/bootstrap/js/bootstrap.js"></script>
    <link href="<?php echo URL;?>scripts/frameworks/bootstrap/css/bootstrap.css" rel="stylesheet" type="text/css">

    <link rel="stylesheet" type="text/css" href="<?php echo URL;?>build/css/<?php echo PROJECT ."/" .$config["view"];?>.css" />
	<script type="text/javascript" src="<?php echo URL;?>build/scripts/<?php echo PROJECT ."/" .$config["view"];?>.js"></script>
</head>
<body <?php if($config['bodyPadding']){ echo "class='body-padding'";}?>> <!--Когда плавающий навбар, нужен отступ от начала, равынй его величине-->
    <div class="full-height container-fluid">
		<div class="row full-height">
            <?php $this->generatePage($config); ?>
		</div>
	</div>
</body>
</html>