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

// Native droid instance
var nativeDroid = null;

/**
 * Packet types.
 * @type {Object}
 */
const PacketType = {
    AUTH_REQUEST: 1,
    AUTH_RESPONSE: 2,
    GAME_STAGE_CHANGE: 3,
    GAME_STAGE_CHANGED: 5,
    MESSAGE_RESPONSE: 4
};

/**
 * Default real time packet room type.
 * @type {string}
 */
const PACKET_ROOM_DEFAULT = 'default';

/**
 * Dworek client application.
 * @type {Object}
 */
var Dworek = {
    /**
     * State section.
     */
    state: {
        /**
         * True if the user authenticated over the real time server, false if not.
         * @type {boolean}
         */
        loggedIn: false,

        /**
         * Active user.
         * @type {string|null}
         */
        user: null,

        /**
         * ID of the currently active game.
         * @type {string|null}
         */
        activeGame: null,

        /**
         * ID of the game that was last viewed by the user.
         * @type {string|null}
         */
        lastViewedGame: null
    },

    /**
     * Start the client.
     */
    start: function() {
        // Start native droid
        this.startNativeDroid();

        // Connect to the real time server
        this.realtime.connect();
    },

    /**
     * Start NativeDroid and related modules.
     */
    startNativeDroid: function() {
        // Initialize NativeDroid, and store it's instance
        nativeDroid = $.nd2();

        // Build
        nativeDroid.build();

        // Build NativeDroid on page initialization
        $(document).bind("pageinit", function() {
            // Make sure the native droid instance is available
            if(nativeDroid === null)
                return;

            // Build the page
            nativeDroid.build();
        });
    },

    /**
     * Real time section.
     */
    realtime: {
        /**
         * Real time socket connection.
         */
        _socket: null,

        /**
         * Create a flag to define whether the user is connected.
         */
        _connected: false,

        /**
         * Define whether this is the users first connection.
         */
        _firstConnection: true,

        /**
         * Connect to the real time server.
         */
        connect: function() {
            // Create a socket instance
            this._socket = io.connect({
                path: '/realtime'
            });

            // Register the event handlers
            this.registerCoreHandlers();

            // Start the authentication timer
            Dworek.realtime.startAuthentication(false, true);

            // Pass received packets to the packet processor
            this._socket.on(PACKET_ROOM_DEFAULT, function(packet) {
                Dworek.realtime.packetProcessor.receivePacket(packet, self._socket);
            });
        },

        /**
         * Register all core handlers for the real time server.
         * These handlers track the connection state of the real time socket.
         */
        registerCoreHandlers: function() {
            // Store this instance
            const self = this;

            // Listen to the test channel
            this._socket.on('test', function(message) {
                // Show a message
                showNotification('Real time received: ' + message.message);
            });

            // Handle connection events
            this._socket.on('connect', function() {
                // Set the connection state
                self._connected = true;

                // Show a notification if this isn't the first time the user disconnected
                if(!self._firstConnection)
                    showNotification('Successfully reconnected!', {
                        vibrate: true
                    });

                // Start the authentication process
                self.startAuthentication(true, false);
            });

            // Handle connection errors
            this._socket.on('connect_error', function() {
                // Set the connection state
                self._connected = false;

                // De-authenticate
                self._deauthenticate();

                // Show a notification
                showNotification('Failed to connect');
            });

            // Handle connection timeouts
            this._socket.on('connect_timeout', function() {
                // Set the connection state
                self._connected = false;

                // De-authenticate
                self._deauthenticate();

                // Show a notification
                showNotification('The connection timed out');
            });

            // Handle reconnection attempts
            this._socket.on('reconnect_attempt', function(attemptCount) {
                // Show a notification
                showNotification('Trying to reconnect...' + (attemptCount > 1 ? ' (attempt ' + attemptCount + ')' : ''));
            });

            // Handle reconnection failures
            this._socket.on('reconnect_failed', function() {
                // Set the connection state
                self._connected = false;

                // De-authenticate
                self._deauthenticate();

                // Show a notification
                showNotification('Failed to reconnect');
            });

            // Handle disconnects
            this._socket.on('disconnect', function() {
                // Set the connection state, and reset the first connection flag
                self._connected = false;
                self._firstConnection = false;

                // De-authenticate
                self._deauthenticate();

                // Show a notification regarding the disconnect
                showNotification('You\'ve lost connection...', {
                    vibrate: true,
                    vibrationPattern: [1000]
                });
            });
        },

        /**
         * Start the authentication process for the current user.
         *
         * @param {boolean=true} now True to immediately authenticate.
         * @param {boolean=true} timer True to start the authentication timer.
         */
        startAuthentication: function(now, timer) {
            // Authenticate each 5 minutes
            if(timer === undefined || !!timer)
                setInterval(this._authenticate, 5 * 60 * 1000);

            // Authenticate now
            if(now === undefined || !!now)
                this._authenticate();
        },

        /**
         * Send an authentication request.
         * @private
         */
        _authenticate: function() {
            // Create the package object
            var packetObject = {
                session: Dworek.utils.getCookie('session_token')
            };

            // Emit the package
            Dworek.realtime.packetProcessor.sendPacket(PacketType.AUTH_REQUEST, packetObject);
        },

        /**
         * De-authenticate.
         * @private
         */
        _deauthenticate: function() {
            // Reset some authentication related flags
            Dworek.state.loggedIn = false;
            Dworek.state.user = null;
        },

        /**
         * Packet processor.
         */
        packetProcessor: {
            /**
             * Registered handlers.
             */
            _handlers: new Map(),

            /**
             * Process a received raw packet.
             *
             * @param {Object} rawPacket Raw packet object.
             * @param socket SocketIO socket.
             */
            receivePacket: function(rawPacket, socket) {
                // Make sure we received an object
                if(!(typeof rawPacket === 'object')) {
                    console.log('Received malformed packet, packet data isn\'t an object, ignoring');
                    return;
                }

                // Make sure a packet type is given
                if(!rawPacket.hasOwnProperty('type')) {
                    console.log('Received malformed packet, packet type not specified, ignoring');
                    return;
                }

                // Get the packet type
                const packetType = rawPacket.type;

                // Invoke the handlers for this packet type
                this.invokeHandlers(packetType, rawPacket, socket);
            },

            /**
             * Send a packet object to the given
             *
             * @param {Number} packetType Packet type value.
             * @param {Object} packet Packet object to send.
             * @param socket SocketIO socket to send the packet over.
             */
            sendPacket: function(packetType, packet, socket) {
                // Make sure we're connected
                if(!Dworek.realtime._connected) {
                    console.log('Unable to send packet to server, not connected');
                    return;
                }

                // Use the default socket if not specified
                if(socket == undefined)
                    socket = Dworek.realtime._socket;

                // Put the packet type in the packet object
                packet.type = packetType;

                // Send the packet over the socket
                socket.emit(PACKET_ROOM_DEFAULT, packet);
            },

            /**
             * Register a handler.
             *
             * @param {Number} packetType Packet type.
             * @param {function} handler Handler function.
             */
            registerHandler: function(packetType, handler) {
                // Array of handlers for this packet type
                var handlers = [];

                // Get the current array of handlers if defined
                if(this._handlers.has(packetType))
                    handlers = this._handlers.get(packetType);

                // Add the handler
                handlers.push(handler);

                // Put the array of handlers back into the handlers map
                this._handlers.set(packetType, handlers);
            },

            /**
             * Get the handler functions for the given packet type.
             *
             * @param {Number} packetType Packet type.
             */
            getHandlers: function(packetType) {
                // Return an empty array if nothing is defined for this packet type
                if(!this._handlers.has(packetType))
                    return [];

                // Get and return the handlers
                return this._handlers.get(packetType);
            },

            /**
             * Invoke the handlers for the given packet type.
             *
             * @param {Number} packetType Packet type.
             * @param {Object} packet Packet object.
             * @param socket SocketIO socket.
             */
            invokeHandlers: function(packetType, packet, socket) {
                // Get the handlers for this packet type
                const handlers = this.getHandlers(packetType);

                // Loop through the handlers
                handlers.forEach(function(handler) {
                    handler(packet, socket);
                });
            }
        }
    },

    /**
     * Utility functions.
     */
    utils: {
        /**
         * Determine whether we're on a game page.
         *
         * @return {boolean} True if we're on a game related page, false if not.
         */
        isGamePage: function() {
            return this.getGameId() !== null;
        },

        /**
         * Get the game ID of the game pages we're currently on.
         *
         * @return {string|null} Game ID or null if we're not on a game page.
         */
        getGameId: function() {
            // Create a regular expression to fetch the game ID from the URL
            const result = window.location.pathname.trim().match(/^\/game\/([a-f0-9]{24})(\/.*)?$/);

            // Make sure any result was found
            if(result === null || result.length < 2)
                return null;

            // Get and return the game ID
            return result[1].toLowerCase();
        },

        /**
         * Get a cookie value.
         * @param {string} cookieName Cookie name.
         * @return {string}
         */
        getCookie: function(cookieName) {
            // Determine the cookie selector, and get an array of cookies
            var selector = cookieName + "=";
            var cookies = document.cookie.split(';');

            // Loop through the list of cookies, find the requested cookie and return it's value
            for(var i = 0; i <cookies.length; i++) {
                var cookie = cookies[i];
                while(cookie.charAt(0) == ' ')
                    cookie = cookie.substring(1);
                if(cookie.indexOf(selector) == 0)
                    return cookie.substring(selector.length,cookie.length);
            }

            // No cookie found, return an empty string
            return '';
        }
    }
};

// Wait for initialization
$(function() {
   // Start Dworek
    Dworek.start();
});

// Register an authentication response packet handler
Dworek.realtime.packetProcessor.registerHandler(PacketType.AUTH_RESPONSE, function(packet) {
    // Set the logged in state
    Dworek.state.loggedIn = !!packet.loggedIn;

    // Show an error notification if we failed to authenticate
    if(packet.hasOwnProperty('valid') && !packet.valid) {
        showNotification('Failed to authenticate', {
            action: {
                text: 'Login',
                action: function() {
                    window.location.href = '/login';
                }
            },
            ttl: 1000 * 60
        });

    } else {
        // Show a console message, we authenticated successfully through the real time server
        console.log('Successfully authenticated through real time server');

        // Store the authenticated user
        Dworek.state.user = packet.user;

        // Update the active game page
        updateActiveGame();
    }
});

// Register game stage change handler
Dworek.realtime.packetProcessor.registerHandler(PacketType.GAME_STAGE_CHANGED, function(packet) {
    // Make sure the packet contains the required properties
    if(!packet.hasOwnProperty('game') || !packet.hasOwnProperty('gameName') || !packet.hasOwnProperty('stage') || !packet.hasOwnProperty('joined'))
        return;

    // Get the packet data
    const gameId = packet.game;
    const gameName = packet.gameName;
    const stage = packet.stage;
    const isJoined = packet.joined;

    // TODO: Invalidate game related page cache!

    // Invalidate game pages if the player didn't join this game
    if(!isJoined) {
        // Check whether the user is currently on the page of this game
        if(gameId == Dworek.utils.getGameId()) {
            showNotification('This game has been changed.', {
                action: {
                    text: 'Refresh',
                    action: function() {
                        window.location.reload();
                    }
                }
            })
        }

        // We're done, return
        return;
    }

    // Define the title, message and actions to show to the user
    var title = 'Game changed';
    var message = 'The stage of the game <i>' + gameName + '</i> has changed.';
    var actions = [];

    // Determine the title
    if(stage == 1)
        title = 'Game started';
    else if(stage == 2)
        title = 'Game finished';

    // Determine whether this game, or a different game has been started
    if(Dworek.utils.getGameId() == gameId) {
        // Build a message to show to the user
        if(stage == 1)
            message = 'This game has been started.';
        else if(stage == 2)
            message = 'This game has been finished.';

        // Create the dialog actions
        actions.push({
            text: 'Refresh',
            type: 'primary'
        });

    } else {
        // Build a message to show to the user
        if(stage == 1)
            message = 'The game <i>' + gameName + '</i> has been started.';
        else if(stage == 2)
            message = 'The game <i>' + gameName + '</i> has been finished.';

        // Create the dialog actions
        actions.push({
            text: 'View game',
            type: 'primary'
        });
        actions.push({
            text: 'Close',
            value: false
        });
    }

    // Show a dialog and notify the user about the state change
    setTimeout(function() {
        showDialog({
            title,
            message,
            actions

        }, function(result) {
            // Go back if the result equals false (because the close button was pressed)
            if(result === false)
                return;

            // TODO: Invalidate current page

            // Reload and/or navigate to the game page
            $.mobile.navigate('/game/' + gameId);
        });
    }, 500);
});

// Register an message response handler
Dworek.realtime.packetProcessor.registerHandler(PacketType.MESSAGE_RESPONSE, function(packet) {
    // Make sure a message has been set
    if(!packet.hasOwnProperty('message'))
        return;

    // Get all properties
    const message = packet.message;
    var error = packet.hasOwnProperty('error') ? !!packet.error : false;
    var type = packet.hasOwnProperty('type') ? packet.type == 'dialog' : false;

    // Show a dialog or toast notification
    if(type) {
        // Show a dialog
        showDialog({
            title: error ? 'Error' : 'Message',
            message,
            actions: [
                {
                    text: 'Close'
                }
            ]
        });

    } else {
        // Show a toast notification
        showNotification(message, {
            action: {
                text: 'Close'
            }
        });
    }
});

// Manage the active game
$(document).bind("pageshow", function() {
    updateActiveGame();
});

/**
 * Update the active game.
 * This will ask the user to change the active game, or will change it automatically if the user doens't have an active game.
 */
function updateActiveGame() {
    // Return if we're not logged in
    if(!Dworek.state.loggedIn)
        return;

    // Return if we're not on a game page
    if(!Dworek.utils.isGamePage()) {
        Dworek.utils.lastViewedGame = null;
        return;
    }

    // Get the ID of the game page
    const gameId = Dworek.utils.getGameId();

    // Return if the last viewed game is this game
    if(Dworek.state.lastViewedGame == gameId)
        return;

    // Check whether this game is different than the active game
    if(Dworek.state.activeGame != gameId) {
        // Automatically select this as active game if we don't have an active game now
        if(Dworek.state.activeGame === null) {
            // Set the active game
            Dworek.state.activeGame = gameId;

            // Show a notification
            showNotification('This is now your active game');

        } else {
            // Ask the user whether to select this as active game
            showDialog({
                title: 'Change active game',
                message: 'You may only have one active game to play at a time.<br /><br />Would you like to change your active game to this game now?',
                actions: [
                    {
                        text: 'Change active game',
                        value: true,
                        state: 'primary',
                        icon: 'zmdi zmdi-swap'
                    },
                    {
                        text: 'Close'
                    }
                ]

            }, function(value) {
                // Set the active game
                if(!!value) {
                    setActiveGame(gameId);
                    return;
                }

                // Show a notification to switch to the active game
                showNotification('Switch to your active game', {
                    action: {
                        text: 'Switch',
                        action: function() {
                            $.mobile.navigate('/game/' + Dworek.state.activeGame, {
                                transition: 'flow'
                            });
                        }
                    }
                });
            });
        }
    }

    // Update the last viewed game
    Dworek.state.lastViewedGame = gameId;
}

/**
 * Set the active game of this user.
 *
 * @param gameId Game ID.
 */
function setActiveGame(gameId) {
    // Show a notification if the active game is changing
    if(Dworek.state.activeGame != gameId) {
        // Show a notification
        showNotification('This is now your active game');

        // TODO: Send packet to server to change the user's active game
    }

    // Set the active game ID
    Dworek.state.activeGame = gameId;
}

/**
 * Get the active jQuery mobile page.
 *
 * @return DOM element of the current page.
 */
function getActivePage() {
    return $.mobile.pageContainer.pagecontainer('getActivePage');
}

/**
 * Unique ID counter, used for generateUniqueId function.
 * @type {number}
 */
var uniqueIdCounter = 0;

/**
 * Generate an unique ID.
 *
 * @param {string} [prefix] Optional ID prefix.
 * @return {string} Unique ID.
 */
function generateUniqueId(prefix) {
    // Create an unique ID
    var id = 'uid-' + ++uniqueIdCounter;

    // Prefix and return
    return prefix != undefined ? prefix + id : id;
}

/**
 * Show a dialog box.
 *
 * @param {Object} options Dialog box configuration.
 * @param {String} [options.title] Dialog box title.
 * @param {String} [options.message] Dialog box message.
 * @param {Array} [options.actions] Array of actions.
 * @param {String} [options.actions.text] Action/button name.
 * @param {String} [options.actions.state=normal] Action/button visual state, can be normal, primary or warning.
 * @param {String} [options.actions.value=] Value returned through the callback when this action is invoked.
 * @param {String} [options.actions.icon=] Icon classes to show an icon.
 * @param {function} [options.actions.action=] Function to be called when the action is invoked.
 * @param {function} callback Called when an action is invoked, or when the popup is closed. First argument will be the action value, or undefined.
 */
function showDialog(options, callback) {
    // Create a defaults object
    const defaults = {
        title: 'Popup',
        message: '',
        actions: []
    };

    // Merge the options
    options = merge(defaults, options);

    // Get the active page, generate an unique popup and button list ID
    const activePage = $.mobile.pageContainer.pagecontainer('getActivePage');
    const popupId = generateUniqueId('popup-');
    const buttonListId = generateUniqueId('button-list-');

    // Create a flag to determine whether we called back
    var calledBack = false;

    // Create a map of actions to bind
    var bindActions = new Map();

    // Build the HTML for the popup
    var popupHtml =
        '<div id="' + popupId + '" data-role="popup">' +
        '    <div data-role="header">' +
        '        <a href="#" class="ui-btn ui-btn-left wow fadeIn" data-rel="back" data-direction="reverse" data-wow-delay="0.4s">' +
        '            <i class="zmdi zmdi-close"></i>' +
        '        </a>' +
        '        <h1 class="nd-title wow fadeIn">' + options.title + '</h1>' +
        '    </div>' +
        '    <div data-role="content" class="ui-content" role="main">' +
        '        <p>' + options.message + '</p>' +
        '        <br />' +
        '        <div id="' + buttonListId + '" class="button-list"></div>' +
        '    </div>' +
        '</div>';

    // Append the popup HTML to the active page
    activePage.append(popupHtml);

    // Get the popup and button list DOM element
    const popupElement = activePage.find('#' + popupId);
    const buttonListElement = $('#' + buttonListId);

    // Set the popup width before it's shown
    popupElement.on('popupbeforeposition', function() {
        popupElement.css('width', Math.min($(window).width() - 15 * 2, 430));
    });

    // Destroy the popup when it's closed
    popupElement.on('popupafterclose', function() {
        // Destroy the popup element
        popupElement.remove();

        // Call back, if we didn't do that yet
        if(!calledBack) {
            if(callback !== undefined)
                callback();
            calledBack = true;
        }
    });

    // Build and open the popup
    popupElement.popup();
    popupElement.popup('open', {
        transition: 'pop',
        shadow: true,
        positionTo: 'window'
    }).trigger('create');

    // Loop through all the actions
    options.actions.forEach(function(action) {
        // Create the button defaults
        const buttonDefaults = {
            text: 'Button',
            value: undefined,
            state: 'normal'
        };

        // Merge the action with the defaults
        action = merge(buttonDefaults, action);

        // Create the button
        var button = $('<a>', {
            text: action.text
        }).buttonMarkup({
            inline: false,
            shadow: false
        });

        // Set the button text
        if(action.icon != undefined)
            button.html('<i class="' + action.icon + '"></i>&nbsp;&nbsp;' + button.html());

        // Add a button state
        if(action.state == 'primary')
            button.addClass('clr-primary');
        else if(action.state == 'warning')
            button.addClass('clr-warning');

        // Bind the click event to the button
        button.bind('click', function() {
            // Call the button action if any is set
            if(typeof action.action === 'function')
                action.action();

            // Call back if we didn't call back yet
            if(!calledBack) {
                if(callback !== undefined)
                    callback(action.value);
                calledBack = true;
            }

            // Close the popup
            popupElement.popup('close');
        });

        // Append the button to the popup
        button.appendTo(buttonListElement);
    });

    // Rebuild native droid
    nativeDroid.build(true);
}

/**
 * Show a notification as configured.
 * This function can be used to show in-page toast, or native notifications.
 *
 * @param {string} message Message to show in the notification.
 * @param {Object} [options] Notification options object.
 * @param {boolean} [options.toast=true] True to show an in-page toast notification, false if not.
 * @param {boolean} [options.native=false] True to show a native notification if supported, false if not.
 * @param {boolean} [options.vibrate=false] True to vibrate the user's device if supported, false if not.
 * @param {Array} [options.vibrationPattern=[500, 250, 500]] Array with vibration pattern timings in milliseconds.
 * @param {Number} [options.ttl=4000] Notification time to live in milliseconds, if supported.
 * @param {Array} [options.actions] Array of actions to show on the notification, if supported.
 * @param {String} [options.actions.text] Action name.
 * @param {function} [options.actions.action=] Action function.
 */
// TODO: Make vibrations configurable
// TODO: Implement native notifications
// TODO: Make action buttons configurable
// TODO: Add option to show an error notification (which has a red background or something)
function showNotification(message, options) {
    // Default options
    var defaultOptions = {
        toast: true,
        native: false,
        vibrate: false,
        vibrationPattern: [500, 250, 500],
        ttl: 4000
    };

    // Set the default options parameter
    if(options === undefined)
        options = {};

    // Merge the options with the default options
    options = merge(defaultOptions, options);

    // Parse the vibration pattern option if set
    if(!Array.isArray(options.vibrationPattern))
        options.vibrationPattern = [options.vibrationPattern];

    // Print the message to the console
    console.log(message);

    // Show a toast notification
    if(options.toast) {
        // Create an array of actions to show on the notification
        var notificationAction = {
            title: "Close",
            fn: function() {},
            color: 'lime'
        };

        // Parse the actions if set, use a default action if not
        if(options.action !== undefined)
            // Create an action object, and add it to the array
            notificationAction = {
                title: options.action.text,
                fn: options.action.action || function() {},
                color: 'lime'
            };

        // Show the toast notification
        new $.nd2Toast({
            message,
            action: notificationAction,
            ttl: options.ttl
        });
    }

    // Vibrate the phone
    if(options.vibrate)
        if("vibrate" in navigator)
            window.navigator.vibrate(options.vibrationPattern);
}

/**
 * Called to show a toast to the user to tell a feature is not yet available.
 */
function featureNotAvailable() {
    showNotification('Feature not available yet', {
        toast: true,
        native: false,
        vibrate: true
    });
}

// TODO: Complete this feature
function showNativeNotification() {
    // Let's check if the browser supports notifications
    if(!('Notification' in window))
        alert('This browser does not support desktop notification');

    // Let's check whether notification permissions have already been granted
    else if(Notification.permission === 'granted')
        // If it's okay let's create a notification
        var notification = new Notification('Feature not available yet');

    // Otherwise, we need to ask the user for permission
    else if(Notification.permission !== 'denied') {
        Notification.requestPermission(function(permission) {
            // If the user accepts, let's create a notification
            if(permission === 'granted')
                var notification = new Notification('Feature not available yet');
        });
    }

    // At last, if the user has denied notifications, and you
    // want to be respectful there is no need to bother them any more.
}

// Nickname randomization
$(document).bind("pageinit", function() {
    // Get the elements
    const nicknameField = $('#field-nickname');
    const nicknameRandomizeButton = $('.nickname-random-btn');

    /**
     * Set the nickname field to a random nickname.
     */
    function setRandomNickname() {
        const animationClass = 'animated';
        const animationTypeClass = 'bounceInLeft';

        // Remove animation classes from previous times
        if(nicknameField.hasClass(animationTypeClass))
            nicknameField.removeClass(animationTypeClass);

        // Animate the text field and set a random nickname next tick
        setTimeout(function() {
            nicknameField.addClass(animationClass + ' ' + animationTypeClass);
            nicknameField.val(getRandomNickname());
        }, 1);
    }

    // Check whether we should randomize on page creation
    if(nicknameField.data('randomize'))
        setRandomNickname();

    // Randomize the nickname on random button click
    nicknameRandomizeButton.click(function(e) {
        // Prevent the default action
        e.preventDefault();

        // Put a random nickname in the field
        setRandomNickname();
    });
});

// User role modification
$(document).bind("pageinit", function() {
    // Get the elements
    const buttonChangeRoles = $('.action-change-user-roles');
    const popup = $('#popupChangeUserRole');
    const checkboxNamePrefix = 'checkbox-user-';
    const checkboxSelector = 'input[type=checkbox][name^=' + checkboxNamePrefix + ']';
    const checkboxSelectedSelector = checkboxSelector + ':checked';
    const checkboxSelectorUser = function(userId) {
        return 'input[type=checkbox][name=' + checkboxNamePrefix + userId.trim() + ']';
    };
    const popupTeamSelector = 'select[name=field-team]';
    const popupSpecialSelector = 'select[name=field-special]';
    const popupSpectatorSelector = 'select[name=field-spectator]';
    const userListSelector = '.user-list';

    // Handle button click events
    buttonChangeRoles.click(function(e) {
        // Prevent the default click operation
        e.preventDefault();

        // Find the user checkboxes on the page that is currently active
        const checkboxes = getActivePage().find(checkboxSelectedSelector);

        // Show a warning if no user is selected
        if(checkboxes.length === 0) {
            showNotification('Please select the users to change', {
                toast: true,
                native: false,
                vibrate: true,
                vibrationPattern: 50
            });
            return;
        }

        // Create a list of user IDs
        var userIds = [];

        // Loop through all checkboxes and put the user ID in the list
        checkboxes.each(function() {
            userIds.push($(this).attr('name').replace(checkboxNamePrefix, '').trim());
        });

        // Open the user dialog
        popup.popup('open', {
            transition: 'pop'
        });

        // Find the apply button of the popup
        const applyButton = popup.find('.action-apply');

        // Unbind the previous click event, and bind a new one
        applyButton.unbind('click');
        applyButton.click(function(e) {
            // Prevent the default action
            e.preventDefault();

            // Get the team, special and spectator fields
            const teamField = popup.find(popupTeamSelector);
            const specialField = popup.find(popupSpecialSelector);
            const spectatorField = popup.find(popupSpectatorSelector);

            // Get the game
            const gameId = Dworek.utils.getGameId();

            // Get the team selector value
            const teamValue = teamField.val();

            // Determine whether the users will be special players and/or spectators
            const special = specialField.val() == 'true';
            const spectator = spectatorField.val() == 'true';

            // Create an role change object to send to the server
            const updateObject = {
                game: gameId,
                users: userIds,
                role: {
                    team: teamValue,
                    special,
                    spectator
                }
            };

            // Disable all checkboxes for the selected users
            checkboxes.each(function() {
                $(this).parent().addClass('ui-disabled');
            });

            // Disable the change roles button
            buttonChangeRoles.addClass('ui-disabled');

            // Callback on error
            const onError = function(message) {
                // Define the error message
                if(typeof message !== 'string')
                    message = 'Failed to change user roles';
                const errorMessage = 'Error: ' + message;

                // Show an error notification
                showNotification(errorMessage, {
                    toast: true,
                    native: false,
                    vibrate: true
                });

                // Revert the checkbox states
                userIds.forEach(function(userId) {
                    // Find it's checkbox
                    const checkbox = getActivePage().find(checkboxSelectorUser(userId));

                    // Enable the checkbox
                    checkbox.parent().removeClass('ui-disabled');
                });

                // Enable the change roles button
                buttonChangeRoles.removeClass('ui-disabled');
            };

            // Do an request to change the user roles
            $.ajax({
                type: "POST",
                url: '/ajax/user/changeRoles',
                data: {
                    data: JSON.stringify(updateObject)
                },
                dataType: 'json',
                success: function(data) {
                    // Show an error message if any kind of error occurred
                    if(data.status != 'ok' || data.hasOwnProperty('error')) {
                        onError(typeof data.error.message === 'string' ? data.error.message : undefined);
                        return;
                    }

                    // Get the list of updated users
                    const updatedUsers = data.updatedUsers;
                    const updatedUsersCount = updatedUsers.length;

                    // Show an error notification
                    showNotification('Changes roles for ' + updatedUsersCount + ' user' + (updatedUsersCount != 1 ? 's' : ''), {
                        toast: true,
                        native: false,
                        vibrate: true,
                        vibrationPattern: 50
                    });

                    // Loop through the list of updated users and remove their checkboxes
                    updatedUsers.forEach(function(userId) {
                        // Find it's checkbox
                        const checkbox = getActivePage().find(checkboxSelectorUser(userId));

                        // Remove the parent checkbox from the page
                        checkbox.parent().remove();
                    });

                    // Loop through the original list of user IDs
                    userIds.forEach(function(userId) {
                        // Check whether this user ID hasn't been covered
                        if(updatedUsers.indexOf(userId) !== -1)
                            return;

                        // Find it's checkbox
                        const checkbox = getActivePage().find(checkboxSelectorUser(userId));

                        // Enable the checkbox
                        checkbox.parent().removeClass('ui-disabled');
                    });

                    // Enable the change roles button
                    buttonChangeRoles.removeClass('ui-disabled');

                    // Count the number of users that is left in the list
                    const usersLeft = getActivePage().find(checkboxSelector).length;

                    // Show a information label if the list is empty
                    if(usersLeft === 0)
                        getActivePage().find(userListSelector).append('<p class="wow fadeInUp no-users">' +
                            '    <i>No users here...</i>' +
                            '</p>');
                },
                error: onError
            });

            // Close the popup
            popup.popup('close');
        });
    });
});

// Team creation
$(document).bind("pageinit", function() {
    // Get the elements
    const buttonCreateTeam = $('.action-create-team');
    const popup = $('#popupCreateTeam');
    const popupTeamNameField = 'input[name=field-team-name]';
    const teamListSelector = '.team-list';
    const noTeamLabelSelector = '.no-teams';

    // Handle button click events
    buttonCreateTeam.click(function(e) {
        // Prevent the default click operation
        e.preventDefault();

        // Open the team creation dialog
        popup.popup('open', {
            transition: 'pop'
        });

        // Find the create button of the popup
        const createButton = popup.find('.action-create');

        // Unbind the previous click event, and bind a new one
        createButton.unbind('click');
        createButton.click(function(e) {
            // Prevent the default action
            e.preventDefault();

            // Get the team name
            const teamField = popup.find(popupTeamNameField);

            // Get the game ID
            const gameId = Dworek.utils.getGameId();

            // Get the team selector value
            const teamName = teamField.val();

            // Create an object to send to the server
            const createObject = {
                game: gameId,
                teamName: teamName
            };

            // Disable the create team button
            buttonCreateTeam.addClass('ui-disabled');

            // Callback on error
            const onError = function(message) {
                // Define the error message
                if(typeof message !== 'string')
                    message = 'Failed to create team';
                const error = 'Error: ' + message;

                // Show an error notification
                showNotification(error, {
                    toast: true,
                    native: false,
                    vibrate: true
                });

                // Enable the create team button
                buttonCreateTeam.removeClass('ui-disabled');
            };

            // Do an request to create the team
            $.ajax({
                type: "POST",
                url: '/ajax/team/createTeam',
                data: {
                    data: JSON.stringify(createObject)
                },
                dataType: 'json',
                success: function(data) {
                    // Show an error message if any kind of error occurred
                    if(data.status != 'ok' || data.hasOwnProperty('error')) {
                        onError(typeof data.error.message === 'string' ? data.error.message : undefined);
                        return;
                    }

                    // Show an error notification
                    showNotification('Team created successfully!', {
                        toast: true,
                        native: false,
                        vibrate: true,
                        vibrationPattern: 50
                    });

                    // Get the ID of the created team
                    var teamId = data.team;

                    // Append the team to the team list
                    // TODO: Append team ID here
                    getActivePage().find(teamListSelector).append('<div class="wow fadeInUp">' +
                        '    <input type="checkbox" name="checkbox-team-' + teamId + '" id="checkbox-team-' + teamId + '">' +
                        '    <label for="checkbox-team-' + teamId + '">' + teamName + '</label>' +
                        '</div>');

                    // Remove the no teams label if it exists
                    getActivePage().find(noTeamLabelSelector).remove();

                    // Trigger page creation, to properly style the new checkbox
                    getActivePage().trigger('create');

                    // Enable the create team button
                    buttonCreateTeam.removeClass('ui-disabled');
                },
                error: onError
            });

            // Close the popup
            popup.popup('close');
        });
    });
});

// Team deletion
$(document).bind("pageinit", function() {
    // Get the elements
    const buttonDeleteSelected = $('.action-delete-selected');
    const checkboxNamePrefix = 'checkbox-team-';
    const checkboxSelector = 'input[type=checkbox][name^=' + checkboxNamePrefix + ']';
    const checkboxSelectedSelector = checkboxSelector + ':checked';
    const checkboxSelectorUser = function(userId) {
        return 'input[type=checkbox][name=' + checkboxNamePrefix + userId.trim() + ']';
    };
    const teamListSelector = '.team-list';

    // Handle button click events
    buttonDeleteSelected.click(function(e) {
        // Prevent the default click operation
        e.preventDefault();

        // Find the user checkboxes on the page that is currently active
        const checkboxes = getActivePage().find(checkboxSelectedSelector);

        // Show a warning if no user is selected
        if(checkboxes.length == 0) {
            showNotification('Please select the teams to delete', {
                toast: true,
                native: false,
                vibrate: true,
                vibrationPattern: 50
            });
            return;
        }

        // Create a list of team IDs
        var teamIds = [];

        // Loop through all checkboxes and put the team ID in the list
        checkboxes.each(function() {
            teamIds.push($(this).attr('name').replace(checkboxNamePrefix, '').trim());
        });

        // Define the delete action
        const deleteAction = function() {
            // Get the game field, and the current game ID
            const gameId = Dworek.utils.getGameId();

            // Create an team delete object to send to the server
            const updateObject = {
                game: gameId,
                teams: teamIds
            };

            // Disable all checkboxes for the selected teams
            checkboxes.each(function() {
                $(this).parent().addClass('ui-disabled');
            });

            // Disable the delete selected button
            buttonDeleteSelected.addClass('ui-disabled');

            // Callback on error
            const onError = function(message) {
                // Define the error message
                if(typeof message !== 'string')
                    message = 'Failed to delete teams';
                const error = 'Error: ' + message;

                // Show an error notification
                showNotification(error, {
                    toast: true,
                    native: false,
                    vibrate: true
                });

                // Revert the checkbox states
                teamIds.forEach(function(teamId) {
                    // Find it's checkbox
                    const checkbox = getActivePage().find(checkboxSelectorUser(teamId));

                    // Enable the checkbox
                    checkbox.parent().removeClass('ui-disabled');
                });

                // Enable the delete selected button
                buttonDeleteSelected.removeClass('ui-disabled');
            };

            // Do an request to change the user roles
            $.ajax({
                type: "POST",
                url: '/ajax/team/deleteTeam',
                data: {
                    data: JSON.stringify(updateObject)
                },
                dataType: 'json',
                success: function(data) {
                    // Show an error message if any kind of error occurred
                    if(data.status != 'ok' || data.hasOwnProperty('error')) {
                        onError(typeof data.error.message === 'string' ? data.error.message : undefined);
                        return;
                    }

                    // Get the list of updated teams
                    const deletedTeams = data.deletedTeams;
                    const deletedTeamCount = deletedTeams.length;

                    // Show an error notification
                    showNotification('Deleted ' + deletedTeamCount + ' team' + (deletedTeamCount != 1 ? 's' : ''), {
                        toast: true,
                        native: false,
                        vibrate: true,
                        vibrationPattern: 50
                    });

                    // Loop through the list of deleted teams and remove their checkboxes
                    deletedTeams.forEach(function(teamId) {
                        // Find it's checkbox
                        const checkbox = getActivePage().find(checkboxSelectorUser(teamId));

                        // Remove the parent checkbox from the page
                        checkbox.parent().remove();
                    });

                    // Loop through the original list of team IDs
                    teamIds.forEach(function(teamId) {
                        // Check whether this team ID hasn't been covered
                        if(deletedTeams.indexOf(teamId) !== -1)
                            return;

                        // Find it's checkbox
                        const checkbox = getActivePage().find(checkboxSelectorUser(teamId));

                        // Enable the checkbox
                        checkbox.parent().removeClass('ui-disabled');
                    });

                    // Enable the delete selected button
                    buttonDeleteSelected.removeClass('ui-disabled');

                    // Count the number of teams that is left in the list
                    const teamsLeft = getActivePage().find(checkboxSelector).length;

                    // Show a information label if the list is empty
                    if(teamsLeft === 0)
                        getActivePage().find(teamListSelector).append('<p class="wow fadeInUp no-teams">' +
                            '    <i>No teams here...</i>' +
                            '</p>');
                },
                error: onError
            });
        };

        // Show the dialog box
        showDialog({
            title: 'Delete team',
            message: 'Are you sure you want to delete the selected teams?',
            actions: [
                {
                    text: 'Delete',
                    icon: 'zmdi zmdi-delete',
                    state: 'warning',
                    action: deleteAction
                },
                {
                    text: 'Cancel'
                }
            ]
        });
    });
});

// Game state buttons
$(document).bind("pageinit", function() {
    // Find the game state buttons
    const startGameButton = $('.action-game-start');
    const stopGameButton = $('.action-game-stop');
    const resumeGameButton = $('.action-game-resume');

    // Define the start action
    const gameStartAction = function() {
        // Set the active game of the user to the current if the user is on a game page
        if(Dworek.utils.isGamePage())
            setActiveGame(Dworek.utils.getGameId());

        // Send a game starting packet to the server
        Dworek.realtime.packetProcessor.sendPacket(PacketType.GAME_STAGE_CHANGE, {
            game: Dworek.utils.getGameId(),
            stage: 1
        });
    };

    // Define the stop action
    const gameStopAction = function() {
        // Send a game stopping packet to the server
        Dworek.realtime.packetProcessor.sendPacket(PacketType.GAME_STAGE_CHANGE, {
            game: Dworek.utils.getGameId(),
            stage: 2
        });
    };

    // Define the resume action
    const gameResumeAction = function() {
        // Set the active game of the user to the current if the user is on a game page
        if(Dworek.utils.isGamePage())
            setActiveGame(Dworek.utils.getGameId());

        // Send a game starting packet to the server
        Dworek.realtime.packetProcessor.sendPacket(PacketType.GAME_STAGE_CHANGE, {
            game: Dworek.utils.getGameId(),
            stage: 1
        });
    };

    // Bind a game start button
    startGameButton.click(function(e) {
        // Prevent the default action
        e.preventDefault();

        // Show a dialog, and ask whether the user is sure
        showDialog({
            title: 'Start game',
            message: 'Are you sure you want to start the game?',
            actions: [
                {
                    text: 'Start game',
                    icon: 'zmdi zmdi-play',
                    state: 'primary',
                    action: gameStartAction
                },
                {
                    text: 'Cancel'
                }
            ]
        });
    });

    // Bind a game stop button
    stopGameButton.click(function(e) {
        // Prevent the default action
        e.preventDefault();

        // Show a dialog, and ask whether the user is sure
        showDialog({
            title: 'Finish game',
            message: 'Are you sure you want to stop and finish this game?',
            actions: [
                {
                    text: 'Finish game',
                    icon: 'zmdi zmdi-stop',
                    state: 'warning',
                    action: gameStopAction
                },
                {
                    text: 'Cancel'
                }
            ]
        });
    });

    // Bind a game resume button
    resumeGameButton.click(function(e) {
        // Prevent the default action
        e.preventDefault();

        // Show a dialog, and ask whether the user is sure
        showDialog({
            title: 'Resume game',
            message: 'Are you sure you want to resume the game from the current state?',
            actions: [
                {
                    text: 'Resume game',
                    icon: 'zmdi zmdi-fast-forward',
                    state: 'primary',
                    action: gameResumeAction
                },
                {
                    text: 'Cancel'
                }
            ]
        });
    });
});

/**
 * Check whether the given value is a JavaScript object.
 * Arrays are not considered objects.
 *
 * @param {*} value The value to check.
 * @return {boolean} True if the value is an object, false if not.
 */
// TODO: Move this function to some utilities file
function isObject(value) {
    // Return false if the value is an array
    if(Array.isArray(value))
        return false;

    // Get the value type
    const type = typeof value;

    // Compare the types and return the result
    return !!value && (type == 'object' || type == 'function');
}

/**
 * Merge an object recursively.
 * Object b overwrites a.
 *
 * @param {Object} a Object A.
 * @param {Object} b Object B.
 * @param {boolean} [recursive=true] True to merge recursively, false to merge flat objects.
 * @return {*} Merged object.
 */
// TODO: Move this function to some utilities file
function merge(a, b, recursive) {
    // Set the default value for the recursive param
    if(recursive === undefined)
        recursive = true;

    // Make sure both objects are given
    if(isObject(a) && isObject(b)) {
        // Loop through all the keys
        for(var key in b) {
            // Check whether we should merge two objects recursively, or whether we should merge flag
            if(recursive && isObject(a[key]) && isObject(b[key]))
                a[key] = merge(a[key], b[key], true);
            else
                a[key] = b[key];
        }
    }

    // Return the object
    return a;
}

// Show a device status popup
$(document).bind("pageinit", function() {
    // Find the device status button
    const deviceStatusButton = $('.action-device-status');

    // Bind a click event
    deviceStatusButton.click(function(e) {
        // Prevent the default action
        e.preventDefault();

        // Define the start action
        const gameStartAction = function() {
            showNotification('TODO: Game should start!');
        };

        // Create the status dialog body
        var statusBody = '<div align="center" class="table-list">' +
            '<table>' +
            '    <tr>' +
            '        <td class="left"><i class="zmdi zmdi-network zmdi-hc-fw"></i> Network</td><td class="status-network-label">Unknown</td>' +
            '    </tr>' +
            '    <tr>' +
            '        <td class="left"><i class="zmdi zmdi-gps-dot zmdi-hc-fw"></i> GPS</td><td class="status-gps-label">Unknown</td>' +
            '    </tr>' +
            '    <tr>' +
            '        <td class="left"><i class="zmdi zmdi-battery zmdi-hc-fw"></i> Battery</td><td class="status-battery-label">Unknown</td>' +
            '    </tr>' +
            '</table>' +
            '</div>';

        // Show a dialog, and ask whether the user is sure
        showDialog({
            title: 'Device status',
            message: statusBody,
            actions: [
                {
                    text: 'Reload application',
                    action: () => location.reload()
                },
                {
                    text: 'Close'
                }
            ]
        });

        updateStatusLabels();
    });
});

/**
 * Update all status labels.
 */
function updateStatusLabels() {
    // Get the labels
    const batteryStatusLabel = $('.status-battery-label');

    // Get a battery promise, and update the battery status label
    navigator.getBattery().then(function(battery) {
        batteryStatusLabel.html(battery.level * 100 + '%');
    });
}
