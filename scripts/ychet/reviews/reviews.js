$(document).ready(function(){
    $("#ychet-reviews .owl-carousel").owlCarousel({
        loop: true,
        items: 1,
        smartSpeed: 1000
    });

    var owl = $("#ychet-reviews .owl-carousel").data('owlCarousel');
    $('.right').bind('click', function(){
        owl.next();
    });

    $('.left').bind('click', function(){
        owl.prev();
    });
});
