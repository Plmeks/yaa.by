$(document).ready(function(){
    $(window).scroll(function () {
        if ($(this).scrollTop() > $('body').outerHeight() - 100) {
            if($(window).outerWidth() <= 768) {
                removeAnimation();
                $('#ychet-scrolled-navbar nav').removeClass('hidden');
            } else {
                $('#ychet-scrolled-navbar nav').removeClass('hidden')
                    .removeClass('animated fadeOutUp')
                    .addClass('animated fadeInDown');
            }

        } else {
            if($(window).outerWidth() <= 768) {
                removeAnimation();
                $('#ychet-scrolled-navbar nav').addClass('hidden');
            } else {
                $('#ychet-scrolled-navbar nav')
                    .removeClass('animated fadeInDown')
                    .addClass('animated fadeOutUp');
            }

        }
    });

    var removeAnimation = function(){
        $('#ychet-scrolled-navbar nav').removeClass('animated fadeInDown')
            .removeClass('animated fadeOutUp');
    };

    $('#ychet-scrolled-navbar nav').addClass("hidden");

//    $('.navbar').removeClass('navbar-fixed-top').addClass('navbar-static');
});
