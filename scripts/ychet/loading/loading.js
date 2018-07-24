$(document).ready(function(){
	var fullyLoadPage = function () {
        $(window).load(function () {
            $("#loading-circle").addClass('animated zoomOut').fadeOut();
        });
	};
	
	fullyLoadPage();
});
