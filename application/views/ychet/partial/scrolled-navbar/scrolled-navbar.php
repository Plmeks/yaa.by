<div id="ychet-scrolled-navbar">
    <nav class="navbar navbar-default navbar-fixed-top">
        <div class="container"> <!-- Container = larger, container-fluid=smaller -->
            <div class="navbar-header hidden-lg hidden-md hidden-sm">
                <button id="mobile-button" type="button" class="navbar-toggle" data-toggle="collapse" data-target="#navbar-scrolled" aria-expanded="true" aria-controls="navbar">
                    <span class="sr-only">Toggle navigation</span>
                    <span class="icon-bar center-block"></span>
                    <span class="icon-bar center-block"></span>
                    <span class="icon-bar center-block"></span>
                </button>
                <a href="<?php echo URL;?>home">
                    <img alt="" src="<?php echo URL;?>content/images/ychet/logo3.png" id="navbar-scrolled-logo-img" />
                </a>
            </div>
            <div class="hidden-lg hidden-md hidden-sm">
                <div id="navbar-scrolled" class="collapse navbar-collapse">
                    <ul class="nav navbar-nav navbar-right">
                        <li><a href="<?php echo URL;?>home">Главная</a></li>
                        <li><a href="<?php echo URL;?>about">О компании</a></li>
                        <li><a href="<?php echo URL;?>services">Услуги</a></li>
                        <li><a href="<?php echo URL;?>career">Вакансии и курсы</a></li>
                        <li><a href="<?php echo URL;?>reviews">Отзывы</a></li>
                        <li><a href="<?php echo URL;?>contacts">Контакты</a></li>
                    </ul>
                </div>
            </div>
            <div class="hidden-xs">
                <div id="navbar-scrolled" class="text-center">
                    <ul class="nav navbar-nav">
                        <li><a href="<?php echo URL;?>home">Главная</a></li>
                        <li><a href="<?php echo URL;?>about">О компании</a></li>
                        <li><a href="<?php echo URL;?>services">Услуги</a></li>
                    </ul>
                    <!--<a class="navbar-brand" href="#">Brand</a>-->
                    <a href="<?php echo URL;?>home">
                        <img alt="" src="<?php echo URL;?>content/images/ychet/logo3.png" id="navbar-scrolled-logo-img"/>
                    </a>
                    <ul class="nav navbar-nav pull-right">
                        <li><a href="<?php echo URL;?>career">Вакансии и курсы</a></li>
                        <li><a href="<?php echo URL;?>reviews">Отзывы</a></li>
                        <li><a href="<?php echo URL;?>contacts">Контакты</a></li>
                    </ul>
                </div>
            </div>
        </div>
    </nav>
</div>

