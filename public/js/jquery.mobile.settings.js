// Set some default jQuery Mobile settings for the current application.
$(document).bind("mobileinit", function(){
    // Set the default page transition
    $.extend($.mobile, {
        defaultPageTransition: 'slide'
    });
});