/**
 * Set some default jQuery Mobile settings for the current application.
 */

$(document).bind("mobileinit", function(){
    $.extend(  $.mobile , {
        defaultPageTransition: "slide"
        // , defaultTheme: "b"
    });

    /*
     $.mobile.page.prototype.options.contentTheme = "b";
     $.mobile.page.prototype.options.theme = "b";
     */
});