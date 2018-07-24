$(document).ready(function(){
    $('#prefooter-simple form').validator().on('submit', function (e) {
        if (e.isDefaultPrevented()) {
        } else {
            e.preventDefault();
            submitForm();
        }

    });

    function submitForm(){
        var name = $('#prefooter-simple [name=name]').val();
        var email = $('#prefooter-simple [name=email]').val();
        var message = $('#prefooter-simple [name=message]').val();

        $.ajax({
            type: "POST",
            url: "http://" + window.location.host + "/home/sendMail",
            data: "name=" + name + "&email=" + email + "&message=" + message,
            success : function(text){
                if (text == "success"){
                    formSuccess();
                }
            }
        });
    }

    function formSuccess() {
        $("#prefooter-simple form").addClass('hidden');
        $("#prefooter-simple .success").removeClass("hidden").addClass('animated fadeIn');
    }
});
