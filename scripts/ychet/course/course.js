$(document).ready(function(){
    $('#accordion').on('shown', function () {
        $(".icon-chevron-down").removeClass("icon-chevron-down").addClass("icon-chevron-up");
    });

    $('#accordion').on('hidden', function () {
        $(".icon-chevron-up").removeClass("icon-chevron-up").addClass("icon-chevron-down");
    });
});
