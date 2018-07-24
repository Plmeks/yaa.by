$(document).ready(function(){
    $(window).scroll(function () {
        if ($(this).scrollTop() > $('body').outerHeight() - 100) {
            if($(window).outerWidth() <= 768) {
                removeAnimation();
                $('.start-navbar').addClass('hidden');
            } else {
                $('.start-navbar').addClass('hidden')
                    .removeClass('animated fadeInDown');
            }

        } else {
            if($(window).outerWidth() <= 768) {
                removeAnimation();
                $('.start-navbar').removeClass('hidden');
            } else {
                $('.start-navbar').removeClass('hidden')
                    .addClass('animated fadeInDown');
            }

        }
    });

    var removeAnimation = function(){
        $('.start-navbar').removeClass('animated fadeInDown');
    };
});
