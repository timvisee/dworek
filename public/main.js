/******************************************************************************
 * Copyright (c) Dworek 2016. All rights reserved.                            *
 *                                                                            *
 * @author Tim Visee                                                          *
 * @website http://timvisee.com/                                              *
 *                                                                            *
 * Open Source != No Copyright                                                *
 *                                                                            *
 * Permission is hereby granted, free of charge, to any person obtaining a    *
 * copy of this software and associated documentation files (the "Software"), *
 * to deal in the Software without restriction, including without limitation  *
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,   *
 * and/or sell copies of the Software, and to permit persons to whom the      *
 * Software is furnished to do so, subject to the following conditions:       *
 *                                                                            *
 * The above copyright notice and this permission notice shall be included    *
 * in all copies or substantial portions of the Software.                     *
 *                                                                            *
 * You should have received a copy of The MIT License (MIT) along with this   *
 * program. If not, see <http://opensource.org/licenses/MIT/>.                *
 ******************************************************************************/

// Initialize NativeDroid on page initialization
$(document).bind("pageinit", function() {
    // Initialize NativeDroid
    $.nd2({
        stats: {
            // UA-Code
            analyticsUA: null
        },
        advertising: {
            active: false,
            path: null,
            extension: null
        }
    });
});

/**
 * Called to show a toast to the user to tell a feature is not yet available.
 */
function featureNotAvailable() {
    // Show a toast notification
    new $.nd2Toast({
        message : 'Feature not available yet',
        action : {
            title: "Close",
            fn: function() {},
            color: 'lime'
        },
        ttl : 8000
    });

    // Notification test
    notifyMe();

    // Vibrate the phone
    if("vibrate" in navigator)
        window.navigator.vibrate([500, 250, 500]);
}

function notifyMe() {
    // Let's check if the browser supports notifications
    if(!('Notification' in window))
        alert('This browser does not support desktop notification');

    // Let's check whether notification permissions have already been granted
    else if (Notification.permission === 'granted') {
        // If it's okay let's create a notification
        var notification = new Notification('Feature not available yet');
    }

    // Otherwise, we need to ask the user for permission
    else if (Notification.permission !== 'denied') {
        Notification.requestPermission(function (permission) {
            // If the user accepts, let's create a notification
            if(permission === 'granted') {
                var notification = new Notification('Feature not available yet');
            }
        });
    }

    // At last, if the user has denied notifications, and you
    // want to be respectful there is no need to bother them any more.
}