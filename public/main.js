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
    MESSAGE_RESPONSE: 4,
    BROADCAST_MESSAGE_REQUEST: 6,
    BROADCAST_MESSAGE: 7,
    BROADCAST_RESOLVE_ALL: 8,
    BROADCAST_RESOLVE: 9,
    LOCATION_UPDATE: 10,
    GAME_INFO: 11,
    GAME_INFO_REQUEST: 12,
    GAME_LOCATIONS_UPDATE: 13,
    GAME_LOCATIONS_REQUEST: 27,
    GAME_DATA_REQUEST: 14,
    GAME_DATA: 15,
    FACTORY_BUILD_REQUEST: 16,
    FACTORY_BUILD_RESPONSE: 17,
    FACTORY_DATA_REQUEST: 18,
    FACTORY_DATA: 19,
    FACTORY_DEFENCE_BUY: 20,
    FACTORY_LEVEL_BUY: 21,
    FACTORY_DEPOSIT_IN: 22,
    FACTORY_WITHDRAW_OUT: 23,
    SHOP_SELL_IN: 24,
    SHOP_BUY_OUT: 25,
    PLAYER_STRENGTH_BUY: 26,
    FACTORY_ATTACK: 28,
    FACTORY_BUILD: 29,
    FACTORY_CAPTURED: 30,
    FACTORY_DESTROYED: 31
};

/**
 * GEO states.
 * @type {{UNKNOWN: number, WORKING: number, NOT_WORKING: number, NO_PERMISSION: number, TIMEOUT: number}}
 */
const GeoStates = {
    UNKNOWN: 0,
    WORKING: 1,
    UNKNOWN_POSITION: 2,
    NOT_WORKING: 3,
    NO_PERMISSION: 4,
    TIMEOUT: 5
};

/**
 * Regular configuration for the game.
 * @type {Object}
 */
const Config = {
    location: {
        /**
         * Time in milliseconds for the location watcher fallback to kick in.
         */
        fallbackTime: 10 * 1000
    }
};

/**
 * Name configuration for the game.
 * @type {Object}
 */
const NameConfig = {
    app: {
        name: 'Dworek'
    },
    currency: {
        name: 'dollars',
        sign: '$'
    },
    factory: {
        name: 'lab'
    },
    shop: {
        name: 'dealer'
    },
    in: {
        name: 'ingredients'
    },
    out: {
        name: 'drugs'
    }
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
             * Stage the active game is in.
             *
             * @type {Number|null} Game stage, or null if it's unknown.
             */
            activeGameStage: null,

            /**
             * The roles the user has in the active game.
             *
             * @type {UserRoles|null} Object with the user type, or null if it's unknown.
             */
            activeGameRoles: null,

            /**
             * Object defining a users role.
             *
             * @typedef {Object} UserRoles
             * @param {boolean} player True if the user is a player, false if not.
             * @param {boolean} spectator True if the user is a spectator, false if not.
             * @param {boolean} special True if the user is a special player, false if not.
             * @param {boolean} requested True if the user requested to join the game, flase if not.
             */

            /**
             * ID of the game that was last viewed by the user.
             * @type {string|null}
             */
            lastViewedGame: null,

            /**
             * Active GEO location watcher.
             * @type {Number|null}
             */
            geoWatcher: null,

            /**
             * Geo watcher fallback interval handle.
             * @type {Number|null}
             */
            geoWatcherFallback: null,

            /**
             * Last known GEO location state.
             * Defined by GeoStates enum.
             * @type {Number}
             */
            geoState: GeoStates.UNKNOWN,

            /**
             * The processed player position.
             * Or null if the position isn't valid anymore.
             * @type {*|null}
             */
            geoPlayerPosition: null,

            /**
             * The time the client was last connected at.
             * @type {Number} Time as timestamp, or -1 if unspecified.
             */
            lastConnected: -1,

            /**
             * Last known reconnection attempt count.
             * @type {Number} Last known reconnection attempt count.
             */
            lastReconnectAttempt: 0
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
         * Game worker sub-system.
         */
        gameWorker: {
            /**
             * Number of the game update request timer handle, or null if none.
             * @type {Number|null}
             */
            gameUpdateRequestTimer: null,

            /**
             * Defines whether the game worker is active, and whether the user is playing the game.
             */
            active: false,

            /**
             * Update the current game worker state based on the active game and known game info.
             */
            update: function() {
                // Determine whether we're playing
                const playing = Dworek.state.activeGameStage == 1 && Dworek.realtime._connected;

                // Define whether the game worker is active
                this.active = playing;

            // Start/stop the timer to update the game info
            if(playing && this.gameUpdateRequestTimer == null) {
                // Start the interval
                this.gameUpdateRequestTimer = setInterval(requestGameInfo, 5 * 60 * 1000);

                // Show a status message
                console.log('Started game info update timer');

            } else if(!playing && this.gameUpdateRequestTimer != null) {
                // Clear the interval and reset the variable
                clearInterval(this.gameUpdateRequestTimer);
                this.gameUpdateRequestTimer = null;

                // Show a status message
                console.log('Stopped game info update timer');
            }

            // TODO: Make sure geo location is supported

            // Determine whether to send locations to the server
            const sendLocationUpdates = playing && (Dworek.state.activeGameRoles.player || Dworek.state.activeGameRoles.special);

            // Start the GEO location watcher if it needs to be started
            if(sendLocationUpdates && Dworek.state.geoWatcher == null) {
                // Show a status message
                console.log('Starting GPS watcher...');

                // Start the geo watcher fallback interval
                Dworek.state.geoWatcherFallback = setInterval(doLocationFallback, Config.location.fallbackTime);

                // Start the position watcher
                Dworek.state.geoWatcher = navigator.geolocation.watchPosition(function(position) {
                    // Process the success callback
                    processLocationSuccess(position, true, true);

                    // Clear the current geo watcher fallback
                    if(Dworek.state.geoWatcherFallback != null) {
                        clearInterval(Dworek.state.geoWatcherFallback);
                        Dworek.state.geoWatcherFallback = null;
                    }

                    // Start the geo watcher fallback interval
                    Dworek.state.geoWatcherFallback = setInterval(doLocationFallback, Config.location.fallbackTime);

                }, function(error) {
                    // Process the error callback
                    processLocationError(error, false);

                }, {
                    enableHighAccuracy: true,
                    timeout: 30 * 1000,
                    maximumAge: 5 * 1000
                });

            } else if(!sendLocationUpdates && Dworek.state.geoWatcher != null) {
                // Show a status message
                console.log('Stopping GPS watcher...');

                // Clear the watch
                navigator.geolocation.clearWatch(Dworek.state.geoWatcher);
                Dworek.state.geoWatcher = null;

                // Clear the current geo watcher fallback
                if(Dworek.state.geoWatcherFallback != null) {
                    clearInterval(Dworek.state.geoWatcherFallback);
                    Dworek.state.geoWatcherFallback = null;
                }
            }

            // Update the status labels
            updateStatusLabels();
        }
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

                // Check whether the user was disconnected for a long time
                if(Dworek.state.lastConnected >= 0) {
                    // Invalidate all other pages after 10 seconds
                    if((Date.now() - Dworek.state.lastConnected) > 10 * 1000)
                        Dworek.utils.flushPages(undefined, false);

                    // Show a refresh notification after two minutes
                    if((Date.now() - Dworek.state.lastConnected) > 2 * 60 * 1000)
                        showDisconnectedTooLongDialog();
                }

                // Reset reconnection attempt counter
                Dworek.state.lastReconnectAttempt = 0;

                // Update the game worker
                Dworek.gameWorker.update();
            });

            // Handle connection errors
            this._socket.on('connect_error', function() {
                // Set the connection state
                self._connected = false;

                // De-authenticate
                self._deauthenticate();

                // Show a notification if the last known reconnection attempt count is acceptable
                const attemptCount = Dworek.state.lastReconnectAttempt;
                if(attemptCount <= 5 || attemptCount % 10 == 0)
                    showNotification('Failed to connect' + (attemptCount > 1 ? ' (attempt ' + attemptCount + ')' : ''));
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
                if(attemptCount <= 5 || attemptCount % 10 == 0)
                    showNotification('Trying to reconnect...' + (attemptCount > 1 ? ' (attempt ' + attemptCount + ')' : ''));

                // Store the last known reconnection attempt count
                Dworek.state.lastReconnectAttempt = attemptCount;
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

                // Set the last connected state
                Dworek.state.lastConnected = Date.now();

                // Create a timer, to show the disconnected for too long if still disconnected after 3 minutes
                setTimeout(function() {
                    // Make sure we're disconnected, then show the dialog
                    if(!Dworek.realtime._connected)
                        showDisconnectedTooLongDialog();
                }, 3 * 60 * 1000);

                // Update the game worker
                Dworek.gameWorker.update();
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
            _handlers: {},

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
                if(this._handlers.hasOwnProperty(packetType.toString()))
                    handlers = this._handlers[packetType.toString()];

                // Add the handler
                handlers.push(handler);

                // Put the array of handlers back into the handlers map
                this._handlers[packetType.toString()] = handlers;
            },

            /**
             * Get the handler functions for the given packet type.
             *
             * @param {Number} packetType Packet type.
             */
            getHandlers: function(packetType) {
                // Return an empty array if nothing is defined for this packet type
                if(!this._handlers.hasOwnProperty(packetType.toString()))
                    return [];

                // Get and return the handlers
                return this._handlers[packetType.toString()];
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
            return this.getGameId() != null;
        },

        /**
         * Get the game ID of the game pages we're currently on.
         *
         * @return {string|null} Game ID or null if we're not on a game page.
         */
        getGameId: function() {
            // Create a regular expression to fetch the game ID from the URL
            const result = document.location.pathname.trim().match(/^\/game\/([a-f0-9]{24})(\/.*)?$/);

            // Make sure any result was found
            if(result === null || result.length < 2)
                return null;

            // Get and return the game ID
            return result[1].toLowerCase();
        },

        /**
         * Determine whether we're on a factory page.
         *
         * @return {boolean} True if we're on a factory related page, false if not.
         */
        isFactoryPage: function() {
            return this.getFactoryId() != null;
        },

        /**
         * Get the factory ID of the factory pages we're currently on.
         *
         * @return {string|null} Factory ID or null if we're not on a game page.
         */
        getFactoryId: function() {
            // Create a regular expression to fetch the factory ID from the URL
            const result = document.location.pathname.trim().match(/^\/game\/([a-f0-9]{24})\/factory\/([a-f0-9]{24})(\/.*)?$/);

            // Make sure any result was found
            if(result === null || result.length < 2)
                return null;

            // Get and return the factory ID
            return result[2].toLowerCase();
        },

        /**
         * Flush all pages that match the URL matcher.
         *
         * @param {RegExp|undefined} [urlMatcher] A regex to flush pages that have a matching URL, undefined to flush all.
         * @param {boolean} [reloadCurrent=false] True to reload the current page, false if not.
         */
        flushPages: function(urlMatcher, reloadCurrent) {
            if(reloadCurrent) {
                document.location.reload();
                return;
            }

            // Get all hidden/cached pages
            const pages = $('div[data-role=page]:hidden');

            // Loop through the list of pages
            pages.each(function() {
                // Match the URL, continue if it doesn't match
                if(urlMatcher !== undefined && $(this).data('url').toString().trim().match(urlMatcher) === null)
                    return;

                // Flush the page
                $(this).remove();
            });
        },

        /**
         * Reload the current page.
         */
        reloadPage: function() {
            // Force reload the application if we're in crazy Chrome
            if(this.isChrome(true)) {
                document.location.reload();
                return;
            }

            // Reload the current page
            this.navigateToPage(document.location.href, true, false, 'fade');
        },

        /**
         * Navigate to the given URL path.
         *
         * @param {string} url Url with a prefixed slash.
         */
        navigateToPath: function(url) {
            // Flush the cache for all other pages
            this.flushPages(undefined, true);

            // Determine the target URL
            const targetUrl = document.location.protocol + '//' + document.location.host + url;

            // Set the location of the user
            window.location = targetUrl;

            // Show an error dialog for Chrome users
            if(Dworek.utils.isChrome(true)) {
                // Add the refresh meta to the page
                $(body).append('<meta http-equiv="refresh" content="0; url=' + targetUrl + '">');

                // Show a dialog after half a second
                setTimeout(function() {
                    // Show the dialog
                    showDialog({
                        title: 'Whoops',
                        message: 'Dworek has detected that Chrome is having problems getting you to the proper page.<br><br>' +
                        'Please click the link below to reload the application, and work around this problem.<br><br>' +
                        '<meta http-equiv="refresh" content="0; url=' + targetUrl + '">' +
                        '<div align="center"><a href="' + targetUrl + '" data-ajax="false">Fuck Google Chrome</a></div>'
                    });
                }, 2000);
            }
        },

        /**
         * Navigate to the given page.
         *
         * @param page Page URL to navigate to.
         * @param reload True to force reload the page if it's already cached.
         * @param [changeHash=true] True to change the hash, false if not.
         * @param [transition] Page transition.
         */
        navigateToPage: function(page, reload, changeHash, transition) {
            // Create the options object
            var options = {
                allowSamePageTransition: true,
                reloadPage: reload,
                reload: reload,
                transition: transition !== undefined ? transition : 'slide',
                changeHash: changeHash !== undefined ? changeHash : true
            };

            // Navigate to the page, wait a little to execute it after other page changing requests
            setTimeout(function() {
                $.mobile.changePage(page, options);
            }, Dworek.utils.isChrome(true) ? 500 : 10);
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
        },

        /**
         * Determine whether the current browser is Google's Crappy Chrome.
         *
         * @param {boolean} [ios=true] True to also return true if this is Chrome on iOS, false if not.
         */
        isChrome: function(ios) {
            // Parse the parameter
            if(ios == undefined)
                ios = true;

            // Prepare some things
            var isChromium = window.chrome,
                winNav = window.navigator,
                vendorName = winNav.vendor,
                isOpera = winNav.userAgent.indexOf("OPR") > -1,
                isIEedge = winNav.userAgent.indexOf("Edge") > -1,
                isIOSChrome = winNav.userAgent.match("CriOS");

            // Determine whether we're on iOS Chrome
            if(isIOSChrome)
                return ios;

            // Determine whether this is Chrome, return the result
            return (isChromium != undefined && isOpera == false && isIEedge == false);
        }
    }
};

// Define the Date#now function if it isn't available
if(!Date.now)
    Date.now = function() {
        return new Date().getTime();
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
                    Dworek.utils.navigateToPath('/login');
                    return false;
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

    // Request new game data
    requestGameData();
    requestFactoryData();
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
                    text: 'Refresh'
                }
            }, function() {
                Dworek.utils.navigateToPath('/game/' + gameId);
                return false;
            });
        }

        // We're done, return
        return;
    }

    // Define the title, message and actions to show to the user
    var title = 'Game changed';
    var message = 'The stage of the game <b>' + gameName + '</b> has changed.';
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
            message = 'The game has been started.';
        else if(stage == 2)
            message = 'The game has been finished.';

        // Create the dialog actions
        actions.push({
            text: 'Refresh',
            type: 'primary'
        });

    } else {
        // Build a message to show to the user
        if(stage == 1)
            message = 'The game <b>' + gameName + '</b> has been started.<br><br>You\'ve joined this game.';
        else if(stage == 2)
            message = 'The game <b>' + gameName + '</b> has been finished.<br><br>You\'ve joined this game.';

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
    showDialog({
        title: title,
        message: message,
        actions: actions

    }, function(result) {
        // Go back if the result equals false (because the close button was pressed)
        if(result === false)
            return;

        // Move to the games page
        Dworek.utils.navigateToPath('/game/' + gameId);
    });

    // Update the active game stage, and request a game info update
    Dworek.state.activeGameStage = stage;
    requestGameInfo(gameId);
});

// Register an message response handler
Dworek.realtime.packetProcessor.registerHandler(PacketType.MESSAGE_RESPONSE, function(packet) {
    // Make sure a message has been set
    if(!packet.hasOwnProperty('message'))
        return;

    // Get all properties
    const message = packet.message;
    const error = packet.hasOwnProperty('error') ? !!packet.error : false;
    const dialog = packet.hasOwnProperty('dialog') && !!packet.dialog;
    const toast = packet.hasOwnProperty('toast') && !!packet.toast;

    // Show a dialog
    if(dialog) {
        // Show a dialog
        showDialog({
            title: error ? 'Error' : 'Message',
            message: message,
            actions: [
                {
                    text: 'Close'
                }
            ]
        });
    }

    // Show a toast notification
    if(toast || (!dialog && !toast)) {
        // Show a toast notification
        showNotification(message, {
            action: {
                text: 'Close'
            }
        });
    }
});

// Handle factory build packets
Dworek.realtime.packetProcessor.registerHandler(PacketType.FACTORY_BUILD, function(packet) {
    // Get all properties
    const factoryId = packet.factory;
    const factoryName = packet.factoryName;
    const isSelf = packet.self;
    const userName = packet.userName;

    // Create a function to navigate to the factory
    const navigateToFactory = function() {
        Dworek.utils.navigateToPage('/game/' + Dworek.utils.getGameId() + '/factory/' + factoryId, false, true, 'flip');
    };

    // Show a message if it's the user itself
    if(isSelf) {
        // Show a dialog
        showDialog({
            title: capitalizeFirst(NameConfig.factory.name) + ' built',
            message: 'The ' + NameConfig.factory.name + ' <b>' + factoryName + '</b> has successfully been built!',
            actions: [
                {
                    text: 'View ' + NameConfig.factory.name,
                    state: 'primary',
                    action: navigateToFactory
                },
                {
                    text: 'Close'
                }
            ]
        });
        return;
    }

    // Show a notification
    showNotification('<b>' + userName + '</b> built a factory', {
        action: {
            text: 'View',
            action: navigateToFactory
        },
        vibrate: true
    });
    return;
});

// Handle factory capture packets
Dworek.realtime.packetProcessor.registerHandler(PacketType.FACTORY_CAPTURED, function(packet) {
    // Get all properties
    const factoryId = packet.factory;
    const factoryName = packet.factoryName;
    const isSelf = packet.self;
    const userName = packet.userName;
    const teamName = packet.teamName;
    const isAlly = packet.ally;
    const isEnemy = packet.enemy;

    // Create a function to navigate to the factory
    const navigateToFactory = function() {
        Dworek.utils.navigateToPage('/game/' + Dworek.utils.getGameId() + '/factory/' + factoryId, false, true, 'flip');
    };

    // Show a message if it's the user itself
    if(isSelf) {
        // Show a dialog
        showDialog({
            title: capitalizeFirst(NameConfig.factory.name) + ' captured',
            message: 'You\'ve successfully captured the <b>' + factoryName + '</b> ' + NameConfig.factory.name + '!',
            actions: [
                {
                    text: 'Close'
                }
            ]
        });
        return;
    }

    // Show a message to allies
    if(isAlly) {
        if(Dworek.utils.isFactoryPage() && Dworek.utils.getFactoryId() == factoryId) {
            // Show a dialog
            showDialog({
                title: capitalizeFirst(NameConfig.factory.name) + ' captured',
                message: '<b>' + userName + '</b> captured this ' + NameConfig.factory.name + ' and it is now owned by our team.',
                actions: [
                    {
                        text: 'Close'
                    }
                ]
            });

        } else {
            // Show a notification
            showNotification('<b>' + userName + '</b> captured an enemy lab', {
                action: {
                    text: 'View',
                    action: navigateToFactory
                },
                vibrate: true
            });
        }
        return;
    }

    // Show a message to enemies
    if(isEnemy) {
        if(Dworek.utils.isFactoryPage() && Dworek.utils.getFactoryId() == factoryId) {
            // Show a dialog
            showDialog({
                title: capitalizeFirst(NameConfig.factory.name) + ' taken over',
                message: 'This ' + NameConfig.factory.name + ' has been captured by <b>' + userName + '</b> in the <b>' + teamName + '</b> team.',
                actions: [
                    {
                        text: 'Close'
                    }
                ]
            });

        } else {
            // Show a notification
            showNotification('<b>' + userName + '</b> took over one of our ' + NameConfig.factory.name + 's', {
                action: {
                    text: 'View',
                    action: navigateToFactory
                },
                vibrate: true
            });
        }
        return;
    }

    // Show a global message
    if(Dworek.utils.isFactoryPage() && Dworek.utils.getFactoryId() == factoryId) {
        // Show a dialog
        showDialog({
            title: capitalizeFirst(NameConfig.factory.name) + ' captured',
            message: 'This ' + NameConfig.factory.name + ' has been captured by <b>' + userName + '</b> in the <b>' + teamName + '</b> team.',
            actions: [
                {
                    text: 'Close'
                }
            ]
        });

    } else {
        // Show a notification
        showNotification('A lab has been captured by <b>' + userName + '</b>', {
            action: {
                text: 'View',
                action: navigateToFactory
            }
        });
    }
});

// Handle factory destroy packets
Dworek.realtime.packetProcessor.registerHandler(PacketType.FACTORY_DESTROYED, function(packet) {
    // Get all properties
    const factoryId = packet.factory;
    const factoryName = packet.factoryName;
    const isSelf = packet.self;
    const userName = packet.userName;
    const teamName = packet.teamName;
    const isAlly = packet.ally;
    const isEnemy = packet.enemy;

    // Function to navigate to the game overview
    const navigateToGameOverview = function() {
        Dworek.utils.navigateToPage('/game/' + Dworek.utils.getGameId(), false, false, 'flip');
    };

    // Show a message if it's the user itself
    if(isSelf) {
        // Show a dialog
        showDialog({
            title: capitalizeFirst(NameConfig.factory.name) + ' destroyed',
            message: 'You\'ve successfully destroyed the <b>' + factoryName + '</b> ' + NameConfig.factory.name + '!',
            actions: [
                {
                    text: 'Game overview',
                    state: 'primary'
                }
            ]
        }, navigateToGameOverview);
        return;
    }

    // Show a message to allies
    if(isAlly) {
        if(Dworek.utils.isFactoryPage() && Dworek.utils.getFactoryId() == factoryId) {
            // Show a dialog
            showDialog({
                title: capitalizeFirst(NameConfig.factory.name) + ' destroyed',
                message: '<b>' + userName + '</b> destroyed this ' + NameConfig.factory.name + ' and it is now owned by our team.',
                actions: [
                    {
                        text: 'Game overview',
                        state: 'primary'
                    }
                ]
            }, navigateToGameOverview);

        } else {
            // Show a notification
            showNotification('<b>' + userName + '</b> destroyed an enemy lab', {
                vibrate: true
            });
        }
        return;
    }

    // Show a message to enemies
    if(isEnemy) {
        if(Dworek.utils.isFactoryPage() && Dworek.utils.getFactoryId() == factoryId) {
            // Show a dialog
            showDialog({
                title: capitalizeFirst(NameConfig.factory.name) + ' destroyed',
                message: 'This ' + NameConfig.factory.name + ' has been destroyed by <b>' + userName + '</b> in the <b>' + teamName + '</b> team.',
                actions: [
                    {
                        text: 'Game overview',
                        state: 'primary'
                    }
                ]
            }, navigateToGameOverview);

        } else {
            // Show a notification
            showNotification('<b>' + userName + '</b> destroyed one of our ' + NameConfig.factory.name + 's', {
                vibrate: true
            });
        }
        return;
    }

    // Show a global message
    if(Dworek.utils.isFactoryPage() && Dworek.utils.getFactoryId() == factoryId) {
        // Show a dialog
        showDialog({
            title: capitalizeFirst(NameConfig.factory.name) + ' destroyed',
            message: 'This ' + NameConfig.factory.name + ' has been destroyed by <b>' + userName + '</b> in the <b>' + teamName + '</b> team.',
            actions: [
                {
                    text: 'Game overview',
                    state: 'primary'
                }
            ]
        }, navigateToGameOverview);

    } else {
        // Show a notification
        showNotification('A lab has been destroyed by <b>' + userName + '</b>');
    }
});

/**
 * Queue of broadcasts that need to be shown to the user.
 * @type {Array}
 */
var broadcastQueue = [];

/**
 * Show the next queued broadcast.
 */
function showNextBroadcast() {
    // Make sure there's any broadcast to show
    if(broadcastQueue.length == 0)
        return;

    // Get the broadcast to show
    const broadcast = broadcastQueue[0];

    // Determine the message
    var dialogMessage = broadcast.message + '<br><hr><i>This broadcast was send by the host of the <b>' + broadcast.gameName + '</b> game.</i>';
    if(Dworek.utils.getGameId() == broadcast.game)
        dialogMessage = broadcast.message + '<br><hr><i>This broadcast was send by the host of this game.</i>';

    // Define the actions for the dialog
    var actions = [];

    // Create a function to show the dialog
    const _showDialog = function() {
        showDialog({
            title: 'Broadcast',
            message: dialogMessage,
            actions: actions
        }, function(value) {
            // Remove the broadcast from the broadcast queue
            var removeIndex = -1;
            broadcastQueue.forEach(function(queuedBroadcast, i) {
                if(queuedBroadcast.token == broadcast.token)
                    removeIndex = i;
            });
            if(removeIndex >= 0)
                broadcastQueue.splice(removeIndex, 1);

            // Don't show the postponed notification if the broadcast was resolved, or if the game is viewed
            if(value === false)
                return;

            // Show the postponed notification
            showNotification('Broadcast postponed', {
                action: {
                    text: 'View',
                    action: function() {
                        setTimeout(function() {
                            _showDialog();
                        }, 500);
                    }
                }
            })
        });

        // Vibrate
        vibrate([500, 250, 1000]);
    };

    // Add a 'view game' action if we're currently not viewing the game
    if(Dworek.utils.getGameId() != broadcast.game)
        actions.push({
            text: 'View game',
            value: false,
            action: function() {
                Dworek.utils.navigateToPath('/game/' + broadcast.game);
            }
        });

    // Add the mark as read button
    actions.push({
        text: 'Mark as read',
        value: false,
        icon: 'zmdi zmdi-check',
        state: 'primary',
        action: function() {
            // Send a broadcast resolve packet
            Dworek.realtime.packetProcessor.sendPacket(PacketType.BROADCAST_RESOLVE, {
                token: broadcast.token
            });
        }
    });

    // Add the postpone button
    actions.push({
        text: 'Postpone',
        icon: 'zmdi zmdi-time-restore'
    });

    // Show the dialog
    _showDialog();
}

// Broadcast
Dworek.realtime.packetProcessor.registerHandler(PacketType.BROADCAST_MESSAGE, function(packet) {
    // Make sure a message has been set
    if(!packet.hasOwnProperty('token') && !packet.hasOwnProperty('message'))
        return;

    // Determine whether a broadcast with this token is already queued, and replace it in that case
    var alreadyQueued = false;
    broadcastQueue.forEach(function(entry, i) {
        if(entry.token == packet.token) {
            broadcastQueue[i] = entry;
            alreadyQueued = true;
        }
    });

    // Add the broadcast to the queue if it wasn't queued yet
    if(!alreadyQueued)
        broadcastQueue.push(packet);

    // Show the next queued broadcast if no dialog is shown
    if(!isDialogVisible())
        showNextBroadcast();
});

// Update the game info
Dworek.realtime.packetProcessor.registerHandler(PacketType.GAME_INFO, function(packet) {
    // Make sure the packet contains the required properties
    if(!packet.hasOwnProperty('game') || !packet.hasOwnProperty('stage') || !packet.hasOwnProperty('roles'))
        return;

    // Get the packet data
    const gameId = packet.game;
    const stage = packet.stage;
    const roles = packet.roles;

    // TODO: Invalidate game related page cache!

    // Make sure the game ID equals our currently active game, ignore this packet if that's not the case
    if(Dworek.state.activeGame != gameId || Dworek.state.activeGame == null)
        return;

    // Determine the roles changed
    var rolesChanged = Dworek.state.activeGameRoles == null;
    if(!rolesChanged) {
        rolesChanged = Dworek.state.activeGameRoles.player != roles.player ||
            Dworek.state.activeGameRoles.spectator != roles.spectator ||
            Dworek.state.activeGameRoles.special != roles.special ||
            Dworek.state.activeGameRoles.requested != roles.requested;
    }

    // Update the game stage and roles for the user
    Dworek.state.activeGameStage = stage;
    Dworek.state.activeGameRoles = {
        player: roles.player,
        spectator: roles.spectator,
        special: roles.special,
        requested: roles.requested
    };

    // Update the game worker
    Dworek.gameWorker.update();

    // Set the player/everyone following mode if the user roles changed and the user is a player/spectator
    if(rolesChanged) {
        if(roles.spectator)
            setFollowEverything(true, {
                showNotification: false
            });
        else if(roles.player)
            setFollowPlayer(true, {
                showNotification: false
            });
    }
});

// Game location updates
Dworek.realtime.packetProcessor.registerHandler(PacketType.GAME_LOCATIONS_UPDATE, function(packet) {
    // Make sure a message has been set
    if(!packet.hasOwnProperty('game'))
        return;

    // Make sure the map data is for the current game
    if(Dworek.utils.getGameId() != packet.game) {
        console.log('Received location data for inactive game, ignoring...');
        return;
    }

    // Check whether this packet contains specific data
    const hasUsers = packet.hasOwnProperty('users');
    const hasFactories = packet.hasOwnProperty('factories');

    // Show a notification
    console.log('Received location data (users: ' + (hasUsers ? packet.users.length : 0) + ', factories: ' + (hasFactories ? packet.factories.length : 0) + ')');

    // Update the users locations
    if(hasUsers)
        updatePlayerMarkers(packet.users);

    // Update the factory locations
    if(hasFactories)
        updateFactoryMarkers(packet.factories);

    // Focus on everything if enabled
    if(getFollowEverything())
        focusEverything();
});

// Update the active game and status labels when a new page is being shown
$(document).bind("pageshow", function() {
    // Update the active game
    updateActiveGame();
});

/**
 * Show a dialog that we're disconnected for too long.
 */
function showDisconnectedTooLongDialog() {
    // Show the dialog
    showDialog({
        title: 'Disconnected',
        message: 'You ' + (Dworek.realtime._connected ? 'we\'re' : 'are') + ' disconnected for too long.<br><br>' +
        'Please refresh the application to make sure everything is up-to-date.',
        actions: [{
            text: 'Refresh',
            state: 'primary',
            icon: 'zmdi zmdi-refresh'
        }]
    }, function() {
        // Determine the refresh path
        var refreshPath = getActivePage().data('url');

        // Redirect a user to a game page if he's on a game related page
        if(Dworek.utils.isGamePage())
            refreshPath = '/game/' + Dworek.utils.getGameId();

        // Redirect the user
        Dworek.utils.navigateToPath(refreshPath);
    });
}

/**
 * Update the active game.
 * This will ask the user to change the active game, or will change it automatically if the user doens't have an active game.
 */
function updateActiveGame() {
    // Return if we're not logged in
    if(!Dworek.state.loggedIn)
        return;

    // Request new game info if the same game is still active
    if(Dworek.state.activeGame != null && (Dworek.state.activeGame == Dworek.utils.getGameId() || !Dworek.utils.isGamePage()))
        requestGameInfo();

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
            setActiveGame(gameId);

        } else {
            // Ask the user whether to select this as active game
            showDialog({
                title: 'Change active game',
                message: 'You may only have one active game to play at a time.<br /><br />Would you like to change your active game to this game now?',
                actions: [
                    {
                        text: 'Activate this game',
                        value: true,
                        state: 'primary',
                        icon: 'zmdi zmdi-swap',
                        action: function() {
                            // Set the active game
                            setActiveGame(gameId);
                        }
                    },
                    {
                        text: 'View current game',
                        value: true,
                        icon: 'zmdi zmdi-long-arrow-return',
                        action: function() {
                            // Navigate to the game page
                            Dworek.utils.navigateToPath('/game/' + Dworek.state.activeGame);
                        }
                    },
                    {
                        text: 'Ignore'
                    }
                ]

            }, function(value) {
                // Return if the action is already handled
                if(!!true)
                    return;

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

    // Update the status labels
    updateStatusLabels();

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

        // Reset the game stage and user type
        Dworek.state.activeGameStage = null;
        Dworek.state.activeGameRoles = null;
    }

    // Send a request to the server for the latest game info
    requestGameInfo(gameId);

    // Set the active game ID
    Dworek.state.activeGame = gameId;
}

/**
 * Request the latest game info from the server.
 * The game info is fetched and handled asynchronously.
 *
 * @param {string} [gameId] ID of the game to request the info for.
 * The currently active game will be used if no game ID is given.
 */
function requestGameInfo(gameId) {
    // Parse the game ID
    if(gameId == undefined)
        gameId = Dworek.state.activeGame;

    // Skip the request if the game ID is invalid
    if(gameId == undefined)
        return;

    // Send a game info update request
    Dworek.realtime.packetProcessor.sendPacket(PacketType.GAME_INFO_REQUEST, {
        game: gameId
    });
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
 * Queue of dialogs to show.
 *
 * @type {Array} Array of objects (options, callback).
 */
var dialogQueue = [];

/**
 * Show a dialog box.
 *
 * @param {Object} options Dialog box configuration.
 * @param {String} [options.title] Dialog box title.
 * @param {String} [options.message] Dialog box message.
 * @param {Array} [options.actions=[]] Array of actions.
 * @param {String} [options.actions.text] Action/button name.
 * @param {String} [options.actions.state='normal'] Action/button visual state, can be normal, primary or warning.
 * @param {String} [options.actions.value=] Value returned through the callback when this action is invoked.
 * @param {String} [options.actions.icon=] Icon classes to show an icon.
 * @param {function} [options.actions.action=] Function to be called when the action is invoked.
 * @param {showDialogCallback} [callback] Called when an action is invoked, or when the popup is closed. First argument will be the action value, or undefined.
 */
function showDialog(options, callback) {
    // Queue the dialog if a dialog is already being shown
    if(isDialogVisible()) {
        dialogQueue.push({options: options, callback: callback});
        return;
    }

    // Create a defaults object
    const defaults = {
        title: 'Popup',
        message: '',
        actions: []
    };

    // Merge the options
    options = merge(defaults, options);

    // Get the active page, generate an unique popup and button list ID
    const activePage = getActivePage();
    const popupId = generateUniqueId('popup-');
    const buttonListId = generateUniqueId('button-list-');

    // Create a flag to determine whether we called back
    var calledBack = false;

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

        // Show any queued dialog
        if(dialogQueue.length > 0) {
            // Get the dialog data
            const dialogData = dialogQueue[0];

            // Shift the dialog queue
            dialogQueue.shift();

            // Call the show dialog function
            showDialog(dialogData.options, dialogData.callback);

        } else
            // No dialog to show anymore, show the next queued broadcast if there is any
            showNextBroadcast();
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
        button.bind('click', function(event) {
            // Prevent the default action
            event.preventDefault();

            // Close the popup
            popupElement.popup('close');

            // Call the button action if any is set
            if(typeof action.action === 'function')
                action.action();

            // Call back if we didn't call back yet
            if(!calledBack) {
                if(callback !== undefined)
                    callback(action.value);
                calledBack = true;
            }
        });

        // Append the button to the popup
        button.appendTo(buttonListElement);
    });

    // Rebuild native droid
    nativeDroid.build(true);
}

/**
 * Called when a dialog action is invoked, or when the dialog is closed.
 * This call back is only called once per dialog.
 * If the dialog is closed without implicitly invoking a specified action
 * (for example, when the user closes it using the dedicated dialog close button)
 * undefined is returned as value.
 *
 * @callback showDialogCallback
 * @param {*} Value of the invoked action. The value will be undefined if no action was explicitly invoked,
 * or if the action doesn't have a value assigned.
 */

/**
 * Determine whether there's any dialog shown on the page.
 */
function isDialogVisible() {
    return getActivePage().find('.ui-popup-container').not('.ui-popup-hidden').length > 0;
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
 * @param {Number} [options.ttl=6000] Notification time to live in milliseconds, if supported.
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
        ttl: 6000
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
            message: message,
            action: notificationAction,
            ttl: options.ttl
        });
    }

    // Vibrate the phone
    if(options.vibrate)
        vibrate(options.vibrationPattern);
}

/**
 * Vibrate.
 * @param {Array} [pattern] Vibration pattern. Array of values, alternating vibration time, and pause time in milliseconds.
 */
function vibrate(pattern) {
    // Make sure we have vibration support
    if(!("vibrate" in navigator))
        return;

    // Parse the pattern
    if(pattern === null)
        pattern = [500, 250, 500];

    // Vibrate
    window.navigator.vibrate(pattern);
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
                    special: special,
                    spectator: spectator
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
                    showNotification('Changed roles for ' + updatedUsersCount + ' user' + (updatedUsersCount != 1 ? 's' : ''), {
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

                    // Flush the other game pages
                    Dworek.utils.flushPages(new RegExp('^\\/game\\/' + Dworek.utils.getGameId()), false);
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

                    // Flush the other game pages
                    Dworek.utils.flushPages(new RegExp('^\\/game\\/' + Dworek.utils.getGameId()), false);
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

                    // Flush the other game pages
                    Dworek.utils.flushPages(new RegExp('^\\/game\\/' + Dworek.utils.getGameId()), false);
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
$(document).bind("pagecreate", function() {
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
    startGameButton.unbind('click');
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
    stopGameButton.unbind('click');
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
    resumeGameButton.unbind('click');
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

// Broadcast button
$(document).bind("pagecreate", function() {
    // Find the broadcast button
    const broadcastButton = $('.action-broadcast');

    broadcastButton.unbind('click');
    broadcastButton.click(function(event) {
        // Prevent the event
        event.preventDefault();

        // Get a random ID for the message field
        const fieldId = generateUniqueId('field');

        // Show a dialog, and ask whether the user is sure
        showDialog({
            title: 'Broadcast message',
            message: 'Enter a message to broadcast to all users in this game:<br><br>' +
            '<label for="' + fieldId + '">Message</label>' +
            '<input type="text" name="' + fieldId + '" id="' + fieldId + '" value="" data-clear-btn="true" />',
            actions: [
                {
                    text: 'Broadcast message',
                    icon: 'zmdi zmdi-mail-send',
                    state: 'primary',
                    action: function() {
                        // Get the input field
                        const messageField = $('#' + fieldId);

                        // Get the message
                        const message = messageField.val();

                        // Make sure any message is entered
                        if(message.trim().length <= 0) {
                            // Show an error dialog to the user
                            showDialog({
                                title: 'Invalid message',
                                message: 'The message you\'ve entered to broadcast is invalid.',
                                actions: [{
                                        text: 'Close'
                                }]
                            });
                            return;
                        }

                        // Send a packet to the server with the broadcast
                        Dworek.realtime.packetProcessor.sendPacket(PacketType.BROADCAST_MESSAGE_REQUEST, {
                            message: message,
                            game: Dworek.utils.getGameId()
                        });
                    }
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
    deviceStatusButton.unbind('click');
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
            '        <td class="left"><i class="zmdi zmdi-play zmdi-hc-fw"></i> Game</td><td class="status-game-label">Unknown</td>' +
            '    </tr>' +
            '    <tr>' +
            '        <td class="left"><i class="zmdi zmdi-network zmdi-hc-fw"></i> Network</td><td class="status-network-label">Unknown</td>' +
            '    </tr>' +
            '    <tr>' +
            '        <td class="left"><i class="zmdi zmdi-gps-dot zmdi-hc-fw"></i> GPS<br>&nbsp;</td><td class="status-gps-label">Unknown</td>' +
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
                    text: 'Test GPS',
                    action: testGps
                },
                {
                    text: 'Reload application',
                    action: function() {
                        location.reload();
                    }
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
 * Battery promise instance.
 * @type {Object|null}
 */
var batteryInstance = null;

/**
 * Update all status labels.
 */
function updateStatusLabels() {
    // Check whether we're playing
    var playing = Dworek.gameWorker.active;

    // Make sure the user roles are fetched
    if(Dworek.state.activeGameRoles != null)
        playing = playing & (Dworek.state.activeGameRoles.player || Dworek.state.activeGameRoles.special);
    else
        playing = false;

    // Get the icon and labels
    const statusIcon = $('.status-icon');
    const gameStatusLabel = $('.status-game-label');
    const networkStatusLabel = $('.status-network-label');
    const gpsStatusLabel = $('.status-gps-label');
    const batteryStatusLabel = $('.status-battery-label');

    // Determine whether the user is connected
    const isOnline = !!navigator.onLine;
    const isConnected = Dworek.realtime._connected;

    // Determine whether the user's device has GPS support
    const hasGps = "geolocation" in navigator;

    // Determine whether the user has battery support and get the battery level
    const hasBattery = typeof navigator.getBattery === 'function';
    var batteryLevel = -1;

    // Get the battery instance if available
    if(hasBattery && batteryInstance === null)
        navigator.getBattery().then(function(battery) {
            // Set the battery instance
            batteryInstance = battery;

            // Add an event listener for level change
            battery.addEventListener('levelchange', function() {
                // Update the status labels
                updateStatusLabels();
            });

            // Update the status labels
            updateStatusLabels();
        });
    else if(batteryInstance !== null)
        batteryLevel = Math.round(batteryInstance.level * 100);

    // Set the network status label
    if(!isConnected && !isOnline)
        networkStatusLabel.html('<span style="color: red;">Not online</span>');
    else if(!isConnected)
        networkStatusLabel.html('<span style="color: red;">Online, not connected</span>');
    else
        networkStatusLabel.html('Connected');

    // Set the GPS status label
    if(!hasGps)
        gpsStatusLabel.html('<span style="color: red;">Not supported</span>');
    else if(Dworek.state.geoState == GeoStates.UNKNOWN)
        gpsStatusLabel.html('Supported<br>' + (Dworek.state.geoWatcher !== null ? 'Active' : 'Not active'));
    else if(Dworek.state.geoState == GeoStates.WORKING)
        gpsStatusLabel.html('Working<br>' + (Dworek.state.geoWatcher !== null ? 'Active' : 'Not active'));
    else if(Dworek.state.geoState == GeoStates.NO_PERMISSION)
        gpsStatusLabel.html('<span style="color: red;">No permission<br>' + (Dworek.state.geoWatcher !== null ? 'Active' : 'Not active') + '</span>');
    else if(Dworek.state.geoState == GeoStates.TIMEOUT)
        gpsStatusLabel.html('<span style="color: red;">Timed out<br>' + (Dworek.state.geoWatcher !== null ? 'Active' : 'Not active') + '</span>');
    else if(Dworek.state.geoState == GeoStates.NOT_WORKING)
        gpsStatusLabel.html('<span style="color: red;">Not working<br>' + (Dworek.state.geoWatcher !== null ? 'Active' : 'Not active') + '</span>');
    else if(Dworek.state.geoState == GeoStates.UNKNOWN_POSITION)
        gpsStatusLabel.html('<span style="color: red;">Unknown position<br>' + (Dworek.state.geoWatcher !== null ? 'Active' : 'Not active') + '</span>');

    // Battery the GPS status label
    if(!hasBattery)
        batteryStatusLabel.html('<i>Not supported</i>');
    else if(batteryLevel < 0)
        batteryStatusLabel.html('<i>Unknown</i>');
    else if(batteryLevel <= 10)
        batteryStatusLabel.html('<span style="color: red;">' + batteryLevel + '%</span>');
    else
        batteryStatusLabel.html(batteryLevel + '%');

    // Determine whether there is an error
    var error = !isConnected || !isOnline || !hasGps
        || (Dworek.state.geoState != GeoStates.UNKNOWN && Dworek.state.geoState != GeoStates.WORKING);

    // Set the game status label
    if(error)
        gameStatusLabel.html('<span style="color: red;">Device not functional</span>');
    else
        gameStatusLabel.html(playing ? 'Playing' : 'Ready to play');

    // Update the error state
    error = error || (hasBattery && batteryLevel >= 0 && batteryLevel <= 10);

    // Determine whether to animate the status icon
    const iconAnimate = playing;
    const iconAnimateDuration = !error ? 10 : 1.5;

    // Set the animation state of the icon
    if(iconAnimate) {
        // Add the animated class
        statusIcon.addClass('animated flash');

        // Update the animation speed
        statusIcon.css({
            animationDuration: iconAnimateDuration + 's'
        });

    } else
        statusIcon.removeClass('animated flash');

    // Set the status icon color
    if(error)
        statusIcon.addClass('mdc-text-red-700');
    else
        statusIcon.removeClass('mdc-text-red-700');

    // Remove the current icons
    statusIcon.removeClass('zmdi-check');
    statusIcon.removeClass('zmdi-play');
    statusIcon.removeClass('zmdi-network-alert');
    statusIcon.removeClass('zmdi-network-off');
    statusIcon.removeClass('zmdi-gps');
    statusIcon.removeClass('zmdi-gps-off');
    statusIcon.removeClass('zmdi-battery-alert');

    // Set the new icon
    if(!isConnected && !isOnline)
        statusIcon.addClass('zmdi-network-off');
    else if(!isConnected)
        statusIcon.addClass('zmdi-network-alert');
    else if(hasBattery && batteryLevel >= 0 && batteryLevel <= 10)
        statusIcon.addClass('zmdi-battery-alert');
    else if(!hasGps || Dworek.state.geoState == GeoStates.NOT_WORKING || Dworek.state.geoState == GeoStates.NO_PERMISSION)
        statusIcon.addClass('zmdi-gps-off');
    else if(playing && (Dworek.state.geoState == GeoStates.UNKNOWN_POSITION || Dworek.state.geoState == GeoStates.TIMEOUT))
        statusIcon.addClass('zmdi-gps');
    else if(playing)
        statusIcon.addClass('zmdi-play');
    else
        statusIcon.addClass('zmdi-check');
}

// Update the status label when the online status changes
$(document).on('offline online', function() {
    updateStatusLabels();
});

/**
 * Test the GPS functionality on this device.
 */
function testGps() {
    // Show a notification
    showNotification('Testing GPS...');

    // Get the current GPS location
    navigator.geolocation.getCurrentPosition(function(position) {
        // Process the location success callback, don't show an notification
        processLocationSuccess(position, false, true);

        // Show a notification regarding the GPS
        showNotification('Your GPS is working');

    }, function(error) {
        // Process the location error callback
        processLocationError(error, true);

    }, {
        enableHighAccuracy: true
    });
}

/**
 * Process a location success callback.
 *
 * @param {*} position Position object.
 * @param {boolean} [notification=true] True to show a notification if the GPS state has changed,
 * false to show no notification.
 * @param {boolean} [alsoUpdateLocal=true] True to update the location, but only send it to the server.
 * @return {boolean} True if a notification is shown, false if not.
 */
function processLocationSuccess(position, notification, alsoUpdateLocal) {
    // Process the showNotification and update parameter
    if(notification == undefined)
        notification = true;
    if(alsoUpdateLocal == undefined)
        alsoUpdateLocal = true;

    // Set the GPS status
    const gpsStateChanged = false;
    if(alsoUpdateLocal)
        setGpsState(GeoStates.WORKING);

    // Show a GPS success notification if it started working again
    if(notification && gpsStateChanged)
        showNotification('Your location is available', {
            vibrate: true
        });

    // Update the location if a game is active and we have the proper roles
    if(Dworek.state.activeGame !== null && Dworek.state.activeGameStage == 1 && Dworek.state.activeGameRoles.player) {
        // Send a location update to the server if we've an active game
        Dworek.realtime.packetProcessor.sendPacket(PacketType.LOCATION_UPDATE, {
            game: Dworek.state.activeGame,
            location: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                altitude: position.coords.altitude,
                accuracy: position.coords.accuracy,
                altitudeAccuracy: position.coords.altitudeAccuracy,
            }
        });
    }

    // Update the player position
    if(alsoUpdateLocal)
        updatePlayerPosition(position);

    // Return true if the GPS state changed
    return gpsStateChanged;
}

/**
 * Process a location error callback.
 *
 * @param {*} error Error object.
 * @param {boolean} showErrorDialog True to show an error dialog regarding the error, false to show a simple notification.
 * @return {boolean} True if a notification is shown, false if not.
 */
function processLocationError(error, showErrorDialog) {
    // Determine whether the GPS state changed, and create a GPS state variable
    var gpsState = GeoStates.UNKNOWN;

    // Set GPS states depending on the error
    if(error.code == error.PERMISSION_DENIED)
        gpsState = GeoStates.NO_PERMISSION;
    else if(error.code == error.POSITION_UNAVAILABLE)
        gpsState = GeoStates.UNKNOWN_POSITION;
    else if(error.code == error.TIMEOUT)
        gpsState = GeoStates.TIMEOUT;
    else if(error.code == error.UNKNOWN_ERROR)
        gpsState = GeoStates.NOT_WORKING;

    // Set the GPS state
    const gpsStateChanged = setGpsState(gpsState);

    // Create a variable that contains the return value
    var returnValue = false;

    // Show an error if the showDialogError parameter is set to true
    if(showErrorDialog) {
        // Define the message to show to the user
        var dialogMessage = 'We were unable to determine your location.<br><br>' +
            'Please make sure the location functionality and GPS is enabled on your device.<br><br>' +
            'It might take a while for your device to determine your location.' +
            'Please keep testing your GPS until your location is found.';


        // Handle the permission denied error
        if(error.code == error.PERMISSION_DENIED)
            dialogMessage = NameConfig.app.name + ' doesn\'t have permission to use your device\'s location.<br><br>' +
                'Please allow this application to use your location and test your GPS again.';

        // Handle the position unavailable error
        else if(error.code == error.POSITION_UNAVAILABLE)
            dialogMessage = 'The location of your device is currently unknown.<br><br>' +
                'It might take a while for your device to determine your location.' +
                'Please test your GPS again until your location is found.<br><br>' +
                'Note: Your device\'s location service and GPS must be enabled.';

        // Handle the timeout error
        else if(error.code == error.TIMEOUT)
            dialogMessage = 'The location of your device couldn\'t be found in time.<br><br>' +
                'You device might temporarily be having trouble determining your location using satellite,' +
                'this problem usually resolves itself after a while.<br><br>' +
                'Please keep testing your GPS until your location is found.<br><br>' +
                'Note: Your device\'s location service and GPS must be enabled.';

        // Show a dialog
        showDialog({
            title: 'GPS error',
            message: dialogMessage,
            actions: [
                {
                    text: 'Test GPS again',
                    state: 'primary',
                    action: testGps
                },
                {
                    text: 'Ignore'
                }
            ]
        });

        // Set the return value
        returnValue = true;

    } else if(gpsStateChanged) {
        // Define the notification message
        var notificationMessage = 'Your location is unknown';

        // Handle the permission denied error
        if(error.code == error.PERMISSION_DENIED)
            notificationMessage = 'No permission for your location';

        // Handle the position unavailable error
        else if(error.code == error.POSITION_UNAVAILABLE)
            notificationMessage = 'Your location is unknown';

        // Handle the timeout error
        else if(error.code == error.TIMEOUT)
            notificationMessage = 'Your location timed out';

        // Show a notification
        showNotification('Error: ' + notificationMessage, {
            action: {
                text: 'Test GPS',
                action: testGps
            },
            vibrate: true,
            ttl: 8000
        });

        // Set the return value
        returnValue = true;
    }

    // Reset the last location if the error isn't a timeout
    if(error.code != error.TIMEOUT)
        Dworek.state.geoPlayerPosition = null;

    // Update the player marker
    updatePlayerMarker();

    // Return the return value
    return returnValue;
}

/**
 * Function to use as geo watcher fallback.
 */
function doLocationFallback() {
    // Make sure we've any known last location
    if(Dworek.state.geoPlayerPosition == null)
        return;

    // Process the last known location, don't update locally
    processLocationSuccess(Dworek.state.geoPlayerPosition, false, false);

    // Get the current position
    navigator.geolocation.getCurrentPosition(function(position) {
        // Process the success callback
        processLocationSuccess(position, true, true);

    }, function(error) {
        // Show an error message
        console.error('Failed to fetch position in location watcher fallback (ignoring): ' + error.message);

    }, {
        enableHighAccuracy: true,
        timeout: 10 * 1000,
        maximumAge: 5 * 1000
    });
}

/**
 * Set the GPS state.
 *
 * @param state GPS state.
 * @return {boolean} True if the GPS state has changed, false if not.
 */
function setGpsState(state) {
    // Make sure the state changes
    if(Dworek.state.geoState == state)
        return false;

    // Set the state
    Dworek.state.geoState = state;

    // Update the status labels
    updateStatusLabels();

    // Return true since we've changed the status
    return true;
}

var map = null;
var playerMarker = null;
var playersMarkers = [];
var factoryMarkers = [];

var mapFollowPlayerButton = null;
var mapFollowEverythingButton = null;
var followPlayer = false;
var followEverything = false;

/**
 * Check whether to follow the player.
 *
 * @return {boolean} True to follow the player, false if not.
 */
function getFollowPlayer() {
    return followPlayer;
}

/**
 * Set whether to follow the player.
 *
 * @param {boolean} state True to follow the player, false if not.
 * @param {Object} [options] Options object.
 * @param {boolean} [options.showNotification=true] True to show a notification, false if not.
 */
function setFollowPlayer(state, options) {
    // Create a defaults object
    const defaultOptions = {
        showNotification: true
    };

    // Parse the options variable
    if(options == undefined)
        options = {};

    // Merge the options object with the defaults
    options = merge(defaultOptions, options, true);

    // Get the old state
    const oldState = followPlayer;

    // Set whether to follow players
    followPlayer = state;

    // Focus on the player if the following state is enabled and stop following everything
    if(state) {
        // Stop following everything
        setFollowEverything(false, {
            showNotification: false
        });

        // Focus the player
        focusPlayer(true);
    }

    // Set the button state depending on the follow player state
    if(mapFollowPlayerButton != null)
        mapFollowPlayerButton.state(state ? 'follow-player' : 'no-follow-player');

    // Show a notification if the state changed
    if(options.showNotification && state != oldState)
        showNotification((state ? 'Started' : 'Stopped') + ' following you');
}

/**
 * Check whether to follow everything.
 *
 * @return {boolean} True to follow everything, false if not.
 */
function getFollowEverything() {
    return followEverything;
}

/**
 * Set whether to follow everything.
 *
 * @param {boolean} state True to follow everything, false if not.
 * @param {Object} [options] Options object.
 * @param {boolean} [options.showNotification=true] True to show a notification, false if not.
 */
function setFollowEverything(state, options) {
    // Create a defaults object
    const defaultOptions = {
        showNotification: true
    };

    // Parse the options variable
    if(options == undefined)
        options = {};

    // Merge the options object with the defaults
    options = merge(defaultOptions, options, true);
    // Get the old state
    const oldState = followEverything;

    // Set whether to follow everything
    followEverything = state;

    // Focus on everything if the following state is enabled and stop following the player
    if(state) {
        // Stop following the player
        setFollowPlayer(false, {
            showNotification: false
        });

        // Focus the map
        focusEverything();
    }

    // Set the button state depending on the follow everything state
    if(mapFollowEverythingButton != null)
        mapFollowEverythingButton.state(state ? 'follow-everything' : 'no-follow-everything');

    // Show a notification if the state changed
    if(options.showNotification && state != oldState)
        showNotification((state ? 'Started' : 'Stopped') + ' following everything');
}

/**
 * Focus on the player (on the map) if the player location is known.
 *
 * @param {boolean} [zoom=false] True to zoom in to the player, false to keep the current zoom level.
 */
function focusPlayer(zoom) {
    // Parse the zoom parameter
    if(zoom == undefined)
        zoom = false;

    // Make sure the map is created and the player marker is available
    if(map == null || playerMarker == null)
        return;

    // Get the player location
    const playerLocation = playerMarker.getLatLng();

    // Focus on the player marker and/or zoom depending on the zoom parameter
    if(zoom)
        map.setView(playerLocation, 18);
    else
        map.panTo(playerLocation);
}

// Update the map size when a page is shown
$(document).bind('pageshow', function() {
    // Make sure we're on a game page
    if(!Dworek.utils.isGamePage())
        return;

    // Make sure a map container is found on the page
    if(getActivePage().find('#map-container').length <= 0)
        return;

    // Update the map size
    updateMapSize(true, true);

    // Focus on the player/everything
    if(getFollowPlayer())
        focusPlayer(true);
    else if(getFollowEverything())
        focusEverything();
});

// Update the active game and status labels when a new page is being shown
$(document).bind("tab-switch", function(event, data) {
    // Check whether there's a map container on the new page
    if(data.to.find('#map-container').length > 0) {
        // Update the map size
        updateMapSize(true, true);

        // Request the map data
        requestMapData();

        // Use the last known player location when possible
        var latlng = [52.0705, 4.3007];
        if(Dworek.state.geoPlayerPosition != null)
            latlng = [Dworek.state.geoPlayerPosition.coords.latitude, Dworek.state.geoPlayerPosition.coords.longitude];

        // Create a map if none has been created yet
        // TODO: Make sure the map container still exists!?
        if(map == null) {
            // Create the map
            map = L.map('map-container').setView(latlng, 18);

            // Set up the tile layers
            L.tileLayer('https://api.mapbox.com/styles/v1/timvisee/cirawmn8f001ch4m27llnb45d/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoidGltdmlzZWUiLCJhIjoiY2lyZXY5cDhzMDAxM2lsbTNicGViaTZkYyJ9.RqbUkoWLWeh_WZoyoxxt-Q', {
                attribution: 'Hosted by <a href="https://timvisee.com/" target="_blank">timvisee.com</a>'
            }).addTo(map);

            // Revert the view or stop following if the map is dragged by the user
            map.on('dragend', function(e) {
                // Revert the view if the user dragged the map less than 150 pixels, stop following otherwise
                if(e.distance <= 150) {
                    // Revert the view
                    if(getFollowPlayer())
                        focusPlayer(false);
                    if(getFollowEverything())
                        focusEverything();

                } else {
                    // Stop following
                    setFollowPlayer(false);
                    setFollowEverything(false);
                }
            });

            // Set the map follow player button
            mapFollowPlayerButton = L.easyButton({
                states: [{
                    stateName: 'no-follow-player',
                    icon:      'zmdi zmdi-account-o',
                    title:     'Start following yourself on the map',
                    onClick: function(button, map) {
                        // Set whether to follow the player
                        setFollowPlayer(true);

                        // Set the button state
                        button.state('follow-player');
                    }
                }, {
                    stateName: 'follow-player',
                    icon:      'zmdi zmdi-account',
                    title:     'Stop following yourself on the map',
                    onClick: function(button, map) {
                        // Set whether to follow the player
                        setFollowPlayer(false);

                        // Set the button state
                        button.state('no-follow-player');
                    }
                }]
            });

            // Set the button state depending on the follow player state
            mapFollowPlayerButton.state(getFollowPlayer() ? 'follow-player' : 'no-follow-player');

            // Set the map follow everything button
            mapFollowEverythingButton = L.easyButton({
                states: [{
                    stateName: 'no-follow-everything',
                    icon:      'zmdi zmdi-accounts-outline',
                    title:     'Start following everything',
                    onClick: function(button, map) {
                        // Set whether to follow everything
                        setFollowEverything(true);

                        // Set the button state
                        button.state('follow-everything');
                    }
                }, {
                    stateName: 'follow-everything',
                    icon:      'zmdi zmdi-accounts',
                    title:     'Stop following everything',
                    onClick: function(button, map) {
                        // Set whether to follow everything
                        setFollowEverything(false);

                        // Set the button state
                        button.state('no-follow-everything');
                    }
                }]
            });

            // Set the button state depending on the follow everything state
            mapFollowEverythingButton.state(getFollowEverything() ? 'follow-everything' : 'no-follow-everything');

            // Add the follow buttons to the map in a bar
            L.easyBar([mapFollowPlayerButton, mapFollowEverythingButton]).addTo(map);

            // Add a refresh button
            L.easyButton('<i class="zmdi zmdi-refresh"></i>', function() {
                // Request map data
                requestMapData();

            }).addTo(map);

            // TODO: Request player positions from server

            // Force update the last player position if it's known
            if(Dworek.state.geoPlayerPosition != null)
                updatePlayerPosition(Dworek.state.geoPlayerPosition);
        }

        // Invalidate the map size, because the container size might be changed
        map.invalidateSize();
    }
});

// Invalidate the map size each second
setTimeout(function() {
    updateMapSize(true, false);
}, 1000);

// Update the map size when the window is resized
$(window).resize(function() {
    updateMapSize(true, true);
});

/**
 * Update the map size.
 *
 * @param {boolean} invalidateSize True to invalidate the map size inside it's container, false to skip this.
 * @param {boolean} updateDiv True to update the map container size based on the page size, false to skip this.
 */
function updateMapSize(invalidateSize, updateDiv) {
    // Update the map container size
    if(updateDiv)
        $('#map-container').height($(window).height() - getActivePage().find('.ui-header').height());

    // Make sure we've a map we know about
    if(map == null)
        return;

    // Invalidate the map size inside the container
    if(invalidateSize)
        map.invalidateSize(true);
}

/**
 * Refresh the location data for the map.
 *
 * @param {string} [game] ID of the game to request the location data for, or null to use the current game.
 */
function requestMapData(game) {
    // Parse the game parameter
    if(game == undefined)
        game = Dworek.state.activeGame;

    // Don't request if we aren't authenticated yet
    if(!Dworek.state.loggedIn)
        return;

    // Make sure the game isn't null
    if(game == null)
        return;

    // Show a status message
    showNotification('Refreshing map...');

    // Request the map data
    Dworek.realtime.packetProcessor.sendPacket(PacketType.GAME_LOCATIONS_REQUEST, {
        game: game
    });
}

/**
 * Update the last known player position.
 * @param position Player position or undefined.
 */
function updatePlayerPosition(position) {
    // Return if the user doesn't have the right roles
    if(Dworek.state.activeGameRoles == null || !(Dworek.state.activeGameRoles.player || Dworek.state.activeGameRoles.special))
        return;

    // Set the last known location
    Dworek.state.geoPlayerPosition = position;

    // Update the player marker
    updatePlayerMarker();
}

/**
 * Update the player marker.
 */
function updatePlayerMarker() {
    // Return if the user doesn't have the right roles
    if(Dworek.state.activeGameRoles == null || !(Dworek.state.activeGameRoles.player || Dworek.state.activeGameRoles.special))
        return;

    // Set the last known location
    const position = Dworek.state.geoPlayerPosition;

    // Update the player markers if the map is created
    if(map != null) {
        // Create a player marker if we don't have one yet
        if(playerMarker == null) {
            // Make sure a player position is known
            if(position == null)
                return;

            // Create the player marker
            playerMarker = L.marker([position.coords.latitude, position.coords.longitude], {
                icon: L.spriteIcon('blue')
            });

            // Show a popup when the user clicks on the marker
            playerMarker.on('click', function() {
                showDialog({
                    title: 'You',
                    message: 'This marker shows your current location.<br><br>' +
                    'The position of your marker is updated as soon as your device detects you\'ve moved.<br><br>' +
                    'The blue circle around you shows how accurate your position is.',
                    actions: [
                        {
                            text: 'Test GPS',
                            action: function() {
                                testGps();
                            }
                        },
                        {
                            text: 'Close'
                        }
                    ]
                })
            });

            // Create a player range circle
            playerMarker.rangeCircle = L.circle([position.coords.latitude, position.coords.longitude], position.coords.accuracy);
            playerMarker.rangeCircle.setStyle({
                opacity: 0.4
            });

            // Add the marker and circle to the map
            playerMarker.addTo(map);
            playerMarker.rangeCircle.addTo(map);

            // Fit the map
            focusEverything();

        } else {
            // Update the position if it's known
            if(position != null) {
                // Update the position and range
                playerMarker.setLatLng([position.coords.latitude, position.coords.longitude]);
                playerMarker.rangeCircle.setLatLng([position.coords.latitude, position.coords.longitude]);
                playerMarker.rangeCircle.setRadius(Dworek.state.geoPlayerPosition.coords.accuracy);

                // Set the marker opacity
                playerMarker.setOpacity(1);
            } else {
                // Set the marker opacity
                playerMarker.setOpacity(0.3);
            }
        }
    }

    // Focus on the player if player following is enabled
    if(getFollowPlayer())
        focusPlayer(false);
    if(getFollowEverything())
        focusEverything();
}

/**
 * Update the markers for other visible users.
 *
 * @param users Users data.
 */
function updatePlayerMarkers(users) {
    // Make sure the map is loaded
    if(map == null)
        return;

    // Return if the user doesn't have the right roles
    if(Dworek.state.activeGameRoles == null || !(Dworek.state.activeGameRoles.player || Dworek.state.activeGameRoles.special || Dworek.state.activeGameRoles.spectator))
        return;

    // Determine whether to fit all users in the map after updating
    var focusMarkers = playersMarkers.length == 0;

    // Loop through the users
    users.forEach(function(user) {
        // Get the user position
        const pos = [user.location.latitude, user.location.longitude];

        // Find the correct marker for the user
        var marker = null;
        playersMarkers.forEach(function(entry) {
            // Skip the loop if we found the marker
            if(marker != null)
                return;

            // Check if this is the correct marker
            if(entry.state.user == user.user)
                marker = entry;
        });

        // Update or create a new marker
        if(marker == null) {
            // Create the marker
            marker = L.marker(pos, {
                icon: !user.shop.isShop ? L.spriteIcon('green') : L.spriteIcon('purple')
            });

            // Store the marker state
            marker.state = {
                user: user.user,
                isShop: user.shop.isShop
            };

            // Add the marker to the map
            marker.addTo(map);

            // Add the marker to the markers list
            playersMarkers.push(marker);

        } else
            // Update the position
            marker.setLatLng(pos);

        // Add a range circle if the user is a shop
        if(user.shop.isShop) {
            // Create the range circle if the marker doesn't have one yet
            if(!marker.hasOwnProperty('rangeCircle') || marker.rangeCircle == null) {
                // Create a range circle
                marker.rangeCircle = L.circle(pos, user.shop.range);
                marker.rangeCircle.addTo(map);

            } else {
                // Update the position and radius of the range circle
                marker.rangeCircle.setLatLng(pos);
                marker.rangeCircle.setRadius(user.shop.range);
            }

            // Set the range circle style
            marker.rangeCircle.setStyle({
                opacity: user.shop.inRange ? 1 : 0.4,
                dashArray: user.shop.inRange ? '' : '5,5',
                color: 'purple'
            });

            // Update the icon
            if(!marker.state.isShop) {
                marker.setIcon(L.spriteIcon('purple'));
                marker.state.isShop = true;
            }

        } else if(marker.hasOwnProperty('rangeCircle') && marker.rangeCircle != null) {
            // Remove the map circle from the map, and remove it from the marker
            map.removeLayer(marker.rangeCircle);
            marker.rangeCircle = null;

            // Update the icon
            if(marker.state.isShop) {
                marker.setIcon(L.spriteIcon('green'));
                marker.state.isShop = false;
            }
        }

        // Show a popup when the user clicks on the marker
        marker.off('click');
        marker.on('click', function() {
            // Create the dialog body
            var dialogBody = '<div align="center" class="table-list">' +
                '<table>' +
                '    <tr>' +
                '        <td class="left"><i class="zmdi zmdi-account zmdi-hc-fw"></i> Player</td><td>' + user.userName + '</td>' +
                '    </tr>' +
                '    <tr>' +
                '        <td class="left"><i class="zmdi zmdi-star zmdi-hc-fw"></i> Ally</td><td>' + (user.ally ? '<span style="color: green;">Yes</span>' : '<span style="color: red;">No</span>') + '</td>' +
                '    </tr>' +
                '    <tr>' +
                '        <td class="left"><i class="zmdi zmdi-shopping-cart zmdi-hc-fw"></i> ' + capitalizeFirst(NameConfig.shop.name) + '</td><td>' + (user.shop.isShop ? 'Yes' : 'No') + '</td>' +
                '    </tr>';

            // Add a range part if the user is a shop
            if(user.shop.isShop) {
                dialogBody +=
                    '    <tr>' +
                    '        <td class="left"><i class="zmdi zmdi-dot-circle zmdi-hc-fw"></i> In range</td><td>' + (user.shop.inRange ? '<span style="color: green;">Yes</span>' : '<span style="color: red;">No</span>') + '</td>' +
                    '    </tr>';
            }

            // Append the bottom
            dialogBody +=
                '</table>' +
                '</div>';

            // Create a list of actions
            var actions = [];

            // Add a buy and sell action if user is a shop that's in range
            if(user.shop.isShop && user.shop.inRange) {
                // Buy button
                actions.push({
                    text: 'Buy ' + NameConfig.in.name,
                    icon: 'zmdi zmdi-arrow-left',
                    action: function() {
                        // Show the buy dialog
                        showShopBuyDialog(user.shop.token);
                    }
                });

                // Sell button
                actions.push({
                    text: 'Sell ' + NameConfig.out.name,
                    icon: 'zmdi zmdi-arrow-right',
                    action: function() {
                        // Show the sell dialog
                        showShopSellDialog(user.shop.token);
                    }
                });
            }

            // Add the close button
            actions.push({
                text: 'Close'
            });

            // Show a dialog
            showDialog({
                title: 'Other player',
                message: dialogBody,
                actions: actions
            });
        });
    });

    // Create an array of marker indices to remove
    var toRemove = [];

    // Loop through all markers and make sure it's user is in the user list
    playersMarkers.forEach(function(entry, i) {
        // Determine whether the user exists
        var exists = false;

        // Loop through the list of users and check whether the user exists
        users.forEach(function(user) {
            // Skip if it exists
            if(exists)
                return;

            // Check whether this is the user
            if(user.user == entry.state.user)
                exists = true;
        });

        // Add the index if the user doens't exist
        if(!exists)
            toRemove.push(i);
    });

    // Remove the markers at the given indices
    for(var i = toRemove.length - 1; i >= 0; i--) {
        // Get the marker to remove
        const removeMarker = playersMarkers[toRemove[i]];

        // Remove the range circle if it has any
        if(removeMarker.hasOwnProperty('rangeCircle') && removeMarker.rangeCircle != null)
            map.removeLayer(removeMarker.rangeCircle);

        // Remove the marker
        map.removeLayer(playersMarkers[toRemove[i]]);

        // Remove the entry from the array
        playersMarkers.splice(toRemove[i], 1);
    }

    // Make sure we still want to fit
    if(focusMarkers && playersMarkers.length == 0)
        focusMarkers = false;

    // Fit all users
    if(focusMarkers && !getFollowPlayer() && getFollowEverything())
        focusEverything();
}

/**
 * Update the markers for visible factories.
 *
 * @param factories Factories data.
 */
function updateFactoryMarkers(factories) {
    // Make sure the map is loaded
    if(map == null)
        return;

    // Return if the user doesn't have the right roles
    if(Dworek.state.activeGameRoles == null || !(Dworek.state.activeGameRoles.player || Dworek.state.activeGameRoles.special || Dworek.state.activeGameRoles.spectator))
        return;

    // Loop through the factories
    factories.forEach(function(factory) {
        // Get the factory position
        const pos = [factory.location.latitude, factory.location.longitude];

        // Find the correct marker for the user
        var marker = null;
        factoryMarkers.forEach(function(entry) {
            // Skip the loop if we found the marker
            if(marker != null)
                return;

            // Check if this is the correct marker
            if(entry.factory.factory == factory.factory)
                marker = entry;
        });

        // Update or create a new marker
        if(marker == null) {
            // Create the marker
            marker = L.marker(pos, {
                icon: L.spriteIcon(factory.ally ? 'orange' : 'red')
            });

            // Create a range circle
            marker.rangeCircle = L.circle(pos, factory.range);
            marker.rangeCircle.setStyle({
                opacity: factory.inRange ? 1 : 0.4,
                dashArray: factory.inRange ? '' : '5,5',
                color: factory.ally ? 'darkorange' : 'red'
            });

            // Add the marker and range circle to the map
            marker.addTo(map);
            marker.rangeCircle.addTo(map);

            // Put the factory instance in the marker
            marker.factory = {
                factory: factory.factory
            };

            // Add the marker to the markers list
            factoryMarkers.push(marker);

        } else {
            // Update the position and range
            marker.setLatLng(pos);
            marker.rangeCircle.setLatLng(pos);
            marker.rangeCircle.setRadius(factory.range);

            marker.rangeCircle.setStyle({
                opacity: factory.inRange ? 1 : 0.4,
                dashArray: factory.inRange ? '' : '5,5'
            });
        }

        // Rebind the popup to show when the user clicks on the marker
        marker.off('click');
        marker.on('click', function() {
            // Create the dialog body
            const dialogBody = '<div align="center" class="table-list">' +
                '<table>' +
                '    <tr>' +
                '        <td class="left"><i class="zmdi zmdi-tag-more zmdi-hc-fw"></i> Name</td><td>' + factory.name + '</td>' +
                '    </tr>' +
                '    <tr>' +
                '        <td class="left"><i class="zmdi zmdi-star zmdi-hc-fw"></i> Ally</td><td>' + (factory.ally ? '<span style="color: green;">Yes</span>' : '<span style="color: red;">No</span>') + '</td>' +
                '    </tr>' +
                '    <tr>' +
                '        <td class="left"><i class="zmdi zmdi-dot-circle zmdi-hc-fw"></i> In range</td><td>' + (factory.inRange ? '<span style="color: green;">Yes</span>' : '<span style="color: red;">No</span>') + '</td>' +
                '    </tr>' +
                '</table>' +
                '</div>';

            // Show a dialog
            showDialog({
                title: capitalizeFirst(NameConfig.factory.name),
                message: dialogBody,
                actions: [
                    {
                        text: 'View ' + NameConfig.factory.name,
                        state: 'primary',
                        action: function() {
                            Dworek.utils.navigateToPage('/game/' + Dworek.utils.getGameId() + '/factory/' + factory.factory, true, true, 'flip');
                        }
                    }, {
                        text: 'Close'
                    }
                ]
            })
        });
    });

    // Create an array of marker indices to remove
    var toRemove = [];

    // Loop through all markers and make sure it's user is in the user list
    factoryMarkers.forEach(function(entry, i) {
        // Determine whether the user exists
        var exists = false;

        // Loop through the list of factory and check whether the factory exists
        factories.forEach(function(factory) {
            // Skip if it exists
            if(exists)
                return;

            // Check whether this is the factory
            if(factory.factory == entry.factory.factory)
                exists = true;
        });

        // Add the index if the user doesn't exist
        if(!exists)
            toRemove.push(i);
    });

    // Remove the markers at the given indices
    for(var i = toRemove.length - 1; i >= 0; i--) {
        // Get the marker to remove
        const removeMarker = factoryMarkers[toRemove[i]];

        // Remove the range circle and then the marker itself
        map.removeLayer(removeMarker.rangeCircle);
        map.removeLayer(removeMarker);

        // Remove the entry from the array
        factoryMarkers.splice(toRemove[i], 1);
    }
}

/**
 * Focus on the map and fit all relevant things.
 */
function focusEverything() {
    // Make sure the map isn't null
    if(map == null)
        return;

    // Create an array of things to fit
    var fitters = [];

    // Add the player marker
    if(playerMarker != null)
        fitters.push(playerMarker);

    // Add the player marker
    if(playersMarkers != null)
        playersMarkers.forEach(function(marker) {
            if(marker.hasOwnProperty('rangeCircle') && marker.rangeCircle != undefined)
                fitters.push(marker.rangeCircle);
            else
                fitters.push(marker);
        });

    // Add the factory markers
    if(factoryMarkers != null)
        factoryMarkers.forEach(function(factoryMarker) {
            fitters.push(factoryMarker.rangeCircle);
        });

    // Make sure we have any fitters
    if(fitters.length == 0)
        return;

    // Fly to the bounds
    map.fitBounds(
        L.featureGroup(fitters).getBounds(),
        {
            paddingTopLeft: [5, 5],
            paddingBottomRight: [35, 35]
        }
    );
}

// Build NativeDroid on page initialization
$(document).bind("pageinit", bindFactoryBuildButton);

/**
 * Bind the factory create button.
 */
function bindFactoryBuildButton() {
    // Get the factory building button
    const buildFactoryButton = $('.action-factory-build');

    // Bind the click event
    buildFactoryButton.unbind('click');
    buildFactoryButton.click(function(event) {
        // Cancel the default event
        event.preventDefault();

        // Show the factory building dialog
        buildFactory();
    });
}

/**
 * Upper case the first character in a string.
 * @param {string} string String to uppercase the first character of.
 * @return {string} Processed string.
 */
function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Build a factory at the current location of the user.
 */
function buildFactory() {
    // Make sure a game is active
    if(Dworek.state.activeGame == null) {
        showNotification('You must be in an active game build a lab');
        return;
    }

    // Make sure the user has the proper roles to build a lab
    if(!Dworek.state.activeGameRoles.player) {
        showNotification('You don\'t have permission to build');
        return;
    }

    // Get a new unique ID
    const fieldId = generateUniqueId('field-factory-name');

    // Build the dialog message
    var dialogMessage = 'Enter a name for the ' + NameConfig.factory.name + ':<br><br>' +
        '<label for="' + fieldId + '">' + capitalizeFirst(NameConfig.factory.name) + ' name</label>' +
        '<input type="text" name="' + fieldId + '" id="' + fieldId + '" value="" data-clear-btn="true" />' +
        '<br><br>' +
        'Building this ' + NameConfig.factory.name + ' will cost you <span class="game-factory-cost">?</span>.';

    // Create a variable for the factory name
    var nameField = null;

    // Show a dialog message
    showDialog({
        title: 'Build ' + capitalizeFirst(NameConfig.factory.name),
        message: dialogMessage,
        actions: [
            {
                text: 'Build ' + capitalizeFirst(NameConfig.factory.name),
                state: 'primary',
                action: function() {
                    // Send a factory creation request
                    Dworek.realtime.packetProcessor.sendPacket(PacketType.FACTORY_BUILD_REQUEST, {
                        game: Dworek.utils.getGameId(),
                        name: nameField.val()
                    });

                    // Show a notification
                    showNotification('Building ' + NameConfig.factory.name + '...');
                }
            },
            {
                text: 'Cancel'
            }
        ]
    });

    // Select the field
    nameField = getActivePage().find('#' + fieldId);

    // Update the game data visuals
    updateGameDataVisuals();
}

/**
 * Object containing the game data of all loaded games.
 * @type {Object}
 */
var gameData = {};

/**
 * Check whether we've any data for the given game ID.
 * The ID of the active game will be used if no game ID is given
 *
 * @param {string} [game] Game ID.
 */
function hasGameData(game) {
    // Parse the game parameter
    if(game == undefined)
        game = Dworek.state.activeGame;

    // Make sure the game ID is valid
    if(game == null)
        return false;

    // Check whether we've game data
    return gameData.hasOwnProperty(game);
}

/**
 * Get the game data of the given game.
 * The ID of the active game will be used if no ID is given.
 *
 * @param {string} [game] ID of the game.
 * @return {Object|null} Object with game data or null if no game data is available.
 */
function getGameData(game) {
    // Parse the game parameter
    if(game == undefined)
        game = Dworek.state.activeGame;

    // Return null if we don't have any game data
    if(!hasGameData(game))
        return null;

    // Get the game data
    return gameData[game];
}

/**
 * Request the game data for the given game.
 *
 * @param {string} [game] ID of the game.
 */
function requestGameData(game) {
    // Parse the game parameter
    if(game == undefined)
        game = Dworek.state.activeGame;

    // Don't request if we aren't authenticated yet
    if(!Dworek.state.loggedIn)
        return;

    // Make sure the game isn't null
    if(game == null)
        return;

    // Show a status message
    console.log('Requesting game data...');

    // Request the game data
    Dworek.realtime.packetProcessor.sendPacket(PacketType.GAME_DATA_REQUEST, {
        game: game
    });
}

/**
 * Get the data for the shop with the given token in a game.
 * The ID of the active game will be used if no ID is given.
 *
 * @param {string|undefined} [game] ID of the game or undefined to use the current game.
 * @param {string} shopToken Token of the shop to get the data for.
 * @return {Object|null} Object with shop data, or null if not available.
 */
function getShopData(game, shopToken) {
    // Get the game data for this shop and make sure it is available
    const data = getGameData(game);
    if(data == null)
        return null;

    // Define a variable to put the shop in
    var foundShop = null;

    // Loop through the list of shops
    data.shops.forEach(function(shop) {
        // Skip if we found the shop
        if(foundShop != null)
            return;

        // Make sure the shop isn't undefined
        if(shop == undefined)
            return;

        // Compare the shop token, mark it as found if they equal
        if(shop.token == shopToken)
            foundShop = shop;
    });

    // Return the found shop, if any is found
    return foundShop;
}

// Update the game info
Dworek.realtime.packetProcessor.registerHandler(PacketType.GAME_DATA, function(packet) {
    // Make sure the packet contains the required properties
    if(!packet.hasOwnProperty('game') || !packet.hasOwnProperty('data'))
        return;

    // Set the game data
    gameData[packet.game] = packet.data;

    // Update the game data visuals
    updateGameDataVisuals();
});

// Update the game data visuals when initializing a page
$(document).bind("pageshow", function() {
    updateGameDataVisuals();
});

function cardAnimationSlideIn(element) {
    element.addClass('animated bounceInDown').hide().slideDown();
}

function cardAnimationSlideOut(element) {
    element.removeClass('animated bounceInLeft').addClass('animated fadeOutRight').delay(500).slideUp(function() {
        $(this).remove();
    });
}

/**
 * Update all visual things that depend on the game data.
 */
function updateGameDataVisuals() {
    // Make sure we're on a game page
    if(!Dworek.utils.isGamePage())
        return;

    // Get the game ID of the active page, and make sure it's valid
    const gameId = Dworek.utils.getGameId();
    if(gameId == null)
        return;

    // Make sure we've any game data for this game, request new data and return if we don't have anything
    if(!hasGameData(gameId)) {
        requestGameData(gameId);
        return;
    }

    // Get the game data
    var data = getGameData(gameId);

    // Get the active page
    const activePage = getActivePage();

    // Get the game actions list
    const gameActionsList = activePage.find('.game-actions-list');

    // Check whether we found a game actions list
    if(gameActionsList.length > 0) {
        // Remove the game data loading label
        gameActionsList.find('.game-data-load-label').remove();

        // Count the number of cards
        var cardCount = 0;

        // Determine whether anything is changed
        var changed = false;

        // Determine whether we should show the factory build button
        const showFactoryBuild = data.hasOwnProperty('factory') && data.factory.hasOwnProperty('canBuild') && data.factory.canBuild;
        if(showFactoryBuild)
            cardCount++;

        // Get the factory build card element if available
        var factoryBuildCardElement = gameActionsList.find('.card-factory-build');

        // Create the factory build card if it isn't available
        if(showFactoryBuild && factoryBuildCardElement.length == 0) {
            gameActionsList.prepend('<div class="nd2-card wow card-factory-build">' +
                '    <div class="card-title has-supporting-text">' +
                '        <h3 class="card-primary-title">Build a ' + capitalizeFirst(NameConfig.factory.name) + '</h3>' +
                '    </div>' +
                '    <div class="card-supporting-text has-action has-title">' +
                '        <p>Build a ' + NameConfig.factory.name + ' at your current location to expand your fleet and start producing more ' + NameConfig.out.name + '.</p>' +
                '    </div>' +
                '    <div class="card-action">' +
                '        <div class="row between-xs">' +
                '            <div class="col-xs-12">' +
                '                <div class="box">' +
                '                    <a href="#" class="ui-btn waves-effect waves-button action-factory-build">' +
                '                        <i class="zmdi zmdi-pin"></i>&nbsp;' +
                '                        Build ' + NameConfig.factory.name + '&nbsp;&nbsp;(<span class="game-factory-cost">?</span>)' +
                '                    </a>' +
                '                </div>' +
                '            </div>' +
                '        </div>' +
                '    </div>' +
                '</div>');
            bindFactoryBuildButton();
            changed = true;
            cardAnimationSlideIn(gameActionsList.find('.card-factory-build'));

        } else if(!showFactoryBuild && factoryBuildCardElement.length > 0) {
            cardAnimationSlideOut(factoryBuildCardElement);
            changed = true;
        }

        // Create an array with the factory IDs that are shown
        var factoryIds = [];

        // Define the factory card selector prefix
        const factoryCardSelector = 'card-factory';

        // Loop through the list of factories
        cardCount += data.factories.length;
        data.factories.forEach(function(factory) {
            // Add the factory ID to the array
            factoryIds.push(factory.id);

            // Determine the card selector for this factory´s card and get the elements for it
            var factoryCardElement = gameActionsList.find('.' + factoryCardSelector + '[data-factory-id=\'' + factory.id + '\']');

            // Skip this run if it already exists
            if(factoryCardElement.length > 0)
                return;

            // Create a new card for this factory
            gameActionsList.prepend('<div class="nd2-card wow ' + factoryCardSelector + '" data-factory-id="' + factory.id + '">' +
                '    <div class="card-title has-supporting-text">' +
                '        <h3 class="card-primary-title">' + factory.name + '</h3>' +
                '    </div>' +
                '    <div class="card-action">' +
                '        <div class="row between-xs">' +
                '            <div class="col-xs-12">' +
                '                <div class="box">' +
                '                    <a href="/game/' + gameId + '/factory/' + factory.id + '" class="ui-btn waves-effect waves-button">' +
                '                        <i class="zmdi zmdi-zoom-in"></i>&nbsp;' +
                '                        View ' + NameConfig.factory.name + '' +
            '                        </a>' +
                '                </div>' +
                '            </div>' +
                '        </div>' +
                '    </div>' +
                '</div>');
            changed = true;

            // Slide out animation
            cardAnimationSlideIn(gameActionsList.find('.' + factoryCardSelector + '[data-factory-id=\'' + factory.id + '\']'));
        });

        // Find all factory cards, and loop through them
        const factoryCards = gameActionsList.find('.' + factoryCardSelector);
        factoryCards.each(function() {
            // Get the factory ID
            const factoryId = $(this).data('factory-id');

            // Delete the card if it's not in the factory IDs array
            if(jQuery.inArray(factoryId, factoryIds) == -1)
                cardAnimationSlideOut($(this));
        });

        // Create an array with the shop tokens that are shown
        var shopTokens = [];

        // Define the shop card selector prefix
        const shopCardSelector = 'card-shop';

        // Loop through the list of shops
        cardCount += data.shops.length;
        data.shops.forEach(function(shop) {
            // Add the shop ID to the array
            shopTokens.push(shop.token);

            // Determine the card selector for this shop´s card and get the elements for it
            var shopCardElement = gameActionsList.find('.' + shopCardSelector + '[data-shop-token=\'' + shop.token + '\']');

            // Skip this run if it already exists
            if(shopCardElement.length > 0)
                return;

            // Create an unique ID for the buy and sell button
            const buyButtonId = generateUniqueId('button-buy-');
            const sellButtonId = generateUniqueId('button-sell-');

            // Create a new card for this shop
            gameActionsList.prepend('<div class="nd2-card wow ' + shopCardSelector + '" data-shop-token="' + shop.token + '">' +
                '    <div class="card-title has-supporting-text">' +
                '        <h3 class="card-primary-title">Local dealer</h3>' +
                '    </div>' +
                '    <div class="card-supporting-text has-action has-title">' +
                '        <p>' + shop.name + ' is currently dealing high quality goods around your location.</p>' +
                '        <table class="table-list ui-responsive">' +
                '            <tr>' +
                '                <td>Selling</td>' +
                '                <td>' + formatMoney(shop.inSellPrice, true) + ' <span style="color: gray;">/ 1 ' + NameConfig.in.name + ' unit</span></td>' +
                '            </tr>' +
                '            <tr>' +
                '                <td>Buying</td>' +
                '                <td>' + formatMoney(shop.outBuyPrice, true) + ' <span style="color: gray;">/ 1 ' + NameConfig.out.name + ' unit</span></td>' +
                '            </tr>' +
                '        </table>' +
                '    </div>' +
                '    <div class="card-action">' +
                '        <div class="row between-xs">' +
                '            <div class="col-xs-12">' +
                '                <div class="box">' +
                '                    <a href="#" id="' + buyButtonId + '" class="ui-btn waves-effect waves-button">' +
                '                        <i class="zmdi zmdi-arrow-left"></i>&nbsp;' +
                '                        Buy ' + NameConfig.in.name + '' +
                '                    </a>' +
                '                    <a href="#" id= "' + sellButtonId + '" class="ui-btn waves-effect waves-button">' +
                '                        <i class="zmdi zmdi-arrow-right"></i>&nbsp;' +
                '                        Sell ' + NameConfig.out.name + '' +
                '                    </a>' +
                '                </div>' +
                '            </div>' +
                '        </div>' +
                '    </div>' +
                '</div>');
            changed = true;

            // Select the buttons elements
            const buyButtonElement = gameActionsList.find('#' + buyButtonId);
            const sellButtonElement = gameActionsList.find('#' + sellButtonId);

            // Show the buy dialog for the shop when clicking the buy button
            buyButtonElement.click(function() {
                // Show the buy dialog for the shop
                showShopBuyDialog(shop.token);
            });

            // Show the sell dialog for the shop when clicking the sell button
            sellButtonElement.click(function() {
                // Show the sell dialog for the shop
                showShopSellDialog(shop.token);
            });

            // Slide out animation
            cardAnimationSlideIn(gameActionsList.find('.' + shopCardSelector + '[data-shop-token=\'' + shop.token + '\']'));
        });

        // Find all shop cards, and loop through them
        const shopCards = gameActionsList.find('.' + shopCardSelector);
        shopCards.each(function() {
            // Get the shop ID
            const shopToken = $(this).data('shop-token');

            // Delete the card if it's not in the shop tokens array
            if(jQuery.inArray(shopToken, shopTokens) == -1)
                cardAnimationSlideOut($(this));
        });

        // Show a label if no card is shown
        if(cardCount == 0)
            gameActionsList.html('<div align="center" class="game-data-load-label">' +
                '    <i>No actions available...</i>' +
                '</div>');

        // Trigger the create event on the game actions list
        if(changed)
            gameActionsList.trigger('create');
    }

    // Check whether we have any factory data
    if(data.hasOwnProperty('factory')) {
        // Update the factory cost label
        if(data.factory.hasOwnProperty('cost'))
            $('.game-factory-cost').html(data.factory.cost != 0 ? formatMoney(data.factory.cost, true) : 'Free');
    }

    if(data.hasOwnProperty('balance')) {
        if(data.balance.hasOwnProperty('money'))
            activePage.find('.game-balance-money').html(formatMoney(data.balance.money, false));
        if(data.balance.hasOwnProperty('in'))
            activePage.find('.game-balance-in').html(formatGoods(data.balance.in));
        if(data.balance.hasOwnProperty('out'))
            activePage.find('.game-balance-out').html(formatGoods(data.balance.out));
    }

    if(data.hasOwnProperty('strength')) {
        if(data.strength.hasOwnProperty('value'))
            activePage.find('.game-player-strength').html(data.strength.value);


        // Get the upgrade button list element, and clear it
        const upgradeButtonlist = activePage.find('.card-player-strength').find('.upgrade-button-list');
        upgradeButtonlist.empty();

        // Check whether there are any defence upgrades
        if(!data.strength.hasOwnProperty('upgrades')) {
            upgradeButtonlist.html('<div align="center"><i>No upgrades available...<br><br></i></div>');

        } else {
            // Loop through the list of upgrades
            data.strength.upgrades.forEach(function(upgrade, i) {
                // Get an unique button ID
                var buttonId = generateUniqueId('button-upgrade-');

                // Append a button
                upgradeButtonlist.append('<a id="' + buttonId + '" class="ui-btn waves-effect waves-button" href="#" data-transition="slide" data-rel="popup">' +
                    '    <i class="zmdi zmdi-plus"></i>&nbsp;' +
                    '    ' + upgrade.name + '&nbsp;&nbsp;<span style="color: gray;">(' + formatMoney(upgrade.cost, true) + ' / +' + upgrade.strength + ')</span>' +
                    '</a>');

                // Get the button
                var button = upgradeButtonlist.find('#' + buttonId);

                // Bind a click action
                button.click(function() {
                    showDialog({
                        title: 'Strength upgrade',
                        message: 'Are you sure you want to buy this upgrade for ' + upgrade.cost + ' ' + NameConfig.currency.name + '?<br><br>' +
                        'This will improve your players defence.',
                        actions: [
                            {
                                text: 'Buy upgrade',
                                state: 'primary',
                                action: function() {
                                    // Send an upgrade packet
                                    Dworek.realtime.packetProcessor.sendPacket(PacketType.PLAYER_STRENGTH_BUY, {
                                        game: Dworek.utils.getGameId(),
                                        index: i,
                                        cost: upgrade.cost,
                                        strength: upgrade.strength
                                    });

                                    // Show a notification
                                    showNotification('Buying upgrade...');
                                }
                            },
                            {
                                text: 'Cancel'
                            }
                        ]
                    })
                });
            });
        }

        // Trigger a create on the list
        upgradeButtonlist.trigger('create');
    }

    if(data.hasOwnProperty('standings')) {
        const list = activePage.find('.current-standings');

        if(data.standings.length == 0) {
            list.html('<tr><td><i style="font-weight: normal; color: gray;">Unknown...</i><br><br>');
            return;
        }

        // Build the HTML
        var tableHtml = '';

        data.standings.forEach(function(entry) {
            tableHtml += '<tr>' +
                '<td><span style="color: ' + (entry.ally ? 'green' : 'red') + ';">' + entry.name + '</span></td>' +
                '<td>' + entry.money + ' <span style="color: gray">' + NameConfig.currency.name + '</span></td>' +
                '</tr>'
        });

        list.html(tableHtml);

        // Trigger a create on the list
        list.trigger('create');
    }

    // Check whether this is the active game
    if(Dworek.state.activeGame == gameId)
        // Update the game stage
        Dworek.state.activeGameStage = data.stage;
}

/**
 * Show an error message to the user.
 * This will show a dialog containing the specified error message.
 *
 * @param {string} message Error message.
 */
function showError(message) {
    // Show the dialog
    showDialog({
        title: 'Error',
        message: message
    });
}

/**
 * Show the buying dialog for a shop with the given token.
 *
 * @param {string} shopToken Shop token.
 */
function showShopBuyDialog(shopToken) {
    // Get the shop data
    const shopData = getShopData(undefined, shopToken);

    // Show an error message if the shop data is unavailable
    if(shopData == null) {
        showError('Shop data not available.<br><br>Please try to use this shop at a later time.');
        return;
    }

    // Determine the amount fo money the user has
    var moneyCurrent = 0;
    if(hasGameData()) {
        var gameData = getGameData();
        if(gameData != null && gameData.hasOwnProperty('balance') && gameData.balance.hasOwnProperty('money'))
            moneyCurrent = gameData.balance.money;
    }

    // Make sure the user has enough money, show a dialog of the user doesn't have enough money
    if(moneyCurrent <= 0) {
        showDialog({
            title: 'No money',
            message: 'You don\'t have any money to spend on ' + NameConfig.in.name + '.<br><br>' +
            'Please make some money by selling ' + NameConfig.out.name + ' first before comming back.'
        });
        return;
    }

    // Calculate the minimum and maximum amount of in and money
    var minIn = 1;
    var maxIn = Math.floor(moneyCurrent / shopData.inSellPrice);
    var minMoney = Math.round(shopData.inSellPrice);
    var maxMoney = Math.floor(maxIn * shopData.inSellPrice);

    // Generate an unique field ID
    const amountFieldId = generateUniqueId('amount-field');
    const amountFieldId2 = generateUniqueId('amount-field');

    // Show the dialog
    showDialog({
        title: 'Buy ' + NameConfig.in.name,
        message: 'Enter the amount of ' + NameConfig.currency.name + ' you\'d like to buy ' + NameConfig.in.name + ' for.<br><br>' +
        '<label for="' + amountFieldId + '">' + capitalizeFirst(NameConfig.currency.name) + ':</label>' +
        '<input type="range" name="' + amountFieldId + '" id="' + amountFieldId + '" value="' + Math.round(moneyCurrent / 2) + '" min="' + minMoney + '" max="' + maxMoney + '" step="' + shopData.inSellPrice + '" data-highlight="true">' +
        '<label for="' + amountFieldId2 + '">' + capitalizeFirst(NameConfig.in.name) + ':</label>' +
        '<input type="range" name="' + amountFieldId2 + '" id="' + amountFieldId2 + '" value="' + Math.round(moneyCurrent / 2 / shopData.inSellPrice) + '" min="' + minIn + '" max="' + maxIn + '" data-highlight="true">',
        actions: [
            {
                text: 'Buy',
                state: 'primary',
                action: function() {
                    // Get the input field value
                    var amount = $('#' + amountFieldId).val();

                    // Send a packet to the server
                    Dworek.realtime.packetProcessor.sendPacket(PacketType.SHOP_SELL_IN, {
                        shop: shopToken,
                        amount: amount,
                        all: false
                    });

                    // Show a notification
                    showNotification('Buying ' + NameConfig.in.name + '...');
                }
            },
            {
                text: 'Full buy',
                action: function() {
                    // Send a packet to the server
                    Dworek.realtime.packetProcessor.sendPacket(PacketType.SHOP_SELL_IN, {
                        shop: shopToken,
                        amount: 0,
                        all: true
                    });

                    // Show a notification
                    showNotification('Full buying ' + NameConfig.in.name + '...');
                }
            },
            {
                text: 'Goodbye'
            }
        ]
    });

    // Select the range sliders
    const rangeMoney = $('#' + amountFieldId);
    const rangeIn = $('#' + amountFieldId2);

    // Update the range sliders on change
    rangeMoney.on('slidestop', function() {
        // Get the amount of money
        var moneyAmount = $(this).val();

        // Calculate the amount of in
        var inAmount = Math.round(moneyAmount / shopData.inSellPrice);

        // Recalculate the money amount to round it
        moneyAmount = Math.round(inAmount * shopData.inSellPrice);

        // Update the range sliders
        rangeMoney.val(moneyAmount).slider('refresh');
        rangeIn.val(inAmount).slider('refresh');
    });
    rangeIn.on('slidestop', function() {
        // Get the amount of in
        var inAmount = $(this).val();

        // Calculate the amount of money
        var moneyAmount = Math.round(inAmount * shopData.inSellPrice);

        // Recalculate the in amount to round it
        inAmount = Math.round(moneyAmount / shopData.inSellPrice);

        // Update the range sliders
        rangeIn.val(inAmount).slider('refresh');
        rangeMoney.val(moneyAmount).slider('refresh');
    });
}

/**
 * Show the sell dialog for the shop with the given token.
 *
 * @param {string} shopToken Token of the shop.
 */
function showShopSellDialog(shopToken) {
    // Determine how many out the user currently has
    var current = 10000;
    if(hasGameData()) {
        var gameData = getGameData();
        if(gameData != null && gameData.hasOwnProperty('balance') && gameData.balance.hasOwnProperty('out'))
            current = gameData.balance.out;
    }

    // Generate an unique field ID
    var amountFieldId = generateUniqueId('amount-field');

    // Show the dialog
    showDialog({
        title: 'Sell ' + NameConfig.out.name,
        message: 'Enter the amount of ' + NameConfig.out.name + ' you\'d like to sell.<br><br>' +
        '<label for="' + amountFieldId + '">' + capitalizeFirst(NameConfig.out.name) + ':</label>' +
        '<input type="range" name="' + amountFieldId + '" id="' + amountFieldId + '" value="' + Math.round(current / 2) + '" min="0" max="' + current + '" data-highlight="true">',
        actions: [
            {
                text: 'Sell',
                state: 'primary',
                action: function() {
                    // Get the input field value
                    var amount = $('#' + amountFieldId).val();

                    // Send a packet to the server
                    Dworek.realtime.packetProcessor.sendPacket(PacketType.SHOP_BUY_OUT, {
                        shop: shopToken,
                        amount: amount,
                        all: false
                    });

                    // Show a notification
                    showNotification('Selling ' + NameConfig.out.name + '...');
                }
            },
            {
                text: 'Sell all',
                action: function() {
                    // Send a packet to the server
                    Dworek.realtime.packetProcessor.sendPacket(PacketType.SHOP_BUY_OUT, {
                        shop: shopToken,
                        amount: 0,
                        all: true
                    });

                    // Show a notification
                    showNotification('Selling all ' + NameConfig.out.name + '...');
                }
            },
            {
                text: 'Goodbye'
            }
        ]
    });
}

/**
 * Object containing the factory data of all loaded games.
 * @type {Object}
 */
var factoryData = {};

/**
 * Check whether we've any data for the given factory ID.
 * The ID of the viewed factory will be used if no ID is given.
 *
 * @param {string} [factory] Factory ID.
 */
function hasFactoryData(factory) {
    // Parse the factory parameter
    if(factory === undefined)
        factory = Dworek.utils.getFactoryId();

    // Make sure the factory ID is valid
    if(factory == null)
        return false;

    // Check whether we've factory data
    return factoryData.hasOwnProperty(factory);
}

/**
 * Get the factory data of the given factory.
 * The ID of the viewed factory will be used if no ID is given.
 *
 * @param {string} [factory] ID of the factory.
 */
function getFactoryData(factory) {
    // Parse the factory parameter
    if(factory == undefined)
        factory = Dworek.utils.getFactoryId();

    // Return null if we don't have any factory data
    if(!hasFactoryData(factory))
        return null;

    // Get the factory data
    return factoryData[factory];
}

/**
 * Request the factory data for the given factory.
 * The ID of the viewed factory will be used if no ID is given.
 *
 * @param {string} [factory] ID of the factory.
 */
function requestFactoryData(factory) {
    // Parse the factory parameter
    if(factory == undefined)
        factory = Dworek.utils.getFactoryId();

    // Don't request if we aren't authenticated yet
    if(!Dworek.state.loggedIn)
        return;

    // Make sure the game isn't null
    if(factory == null)
        return;

    // Show a status message
    console.log('Requesting factory data...');

    // Request the game data
    Dworek.realtime.packetProcessor.sendPacket(PacketType.FACTORY_DATA_REQUEST, {
        factory: factory
    });
}

// Update the factory info
Dworek.realtime.packetProcessor.registerHandler(PacketType.FACTORY_DATA, function(packet) {
    // Make sure the packet contains the required properties
    if(!packet.hasOwnProperty('factory') || !packet.hasOwnProperty('game') || !packet.hasOwnProperty('data'))
        return;

    // Get the packet data
    const factoryId = packet.factory;
    const data = packet.data;

    // Set the factory data
    factoryData[factoryId] = data;

    // Check whether we're on this factory page
    if(Dworek.utils.getFactoryId() == factoryId) {
        // Update the factory data visuals
        updateFactoryDataVisuals();
    }
});

// Update the factory data visuals when initializing a page
$(document).bind("pageshow", function() {
    updateFactoryDataVisuals(true);
});

/**
 * Update all visual things that depend on the game data.
 * @param {boolean} [firstShow] If this is the first time the page is shown.
 */
function updateFactoryDataVisuals(firstShow) {
    if(firstShow == undefined)
        firstShow = false;

    // Make sure we're on a factory page
    if(!Dworek.utils.isFactoryPage())
        return;

    // Get the factory ID and make sure it's valid
    const factoryId = Dworek.utils.getFactoryId();
    if(factoryId == null)
        return;

    // Make sure we've any factory data for this factory, request new data and return if we don't have anything
    if(!hasFactoryData(factoryId))
        requestFactoryData(factoryId);

    // Get the factory data
    var data = getFactoryData(factoryId);
    if(data == null)
        data = {};

    // Get the active page
    const activePage = getActivePage();

    // Determine whether the lab is visible
    var visible = !data.hasOwnProperty('visible') || data.visible;

    // Determine whether the user can modify this lab
    const canModify = visible && data.hasOwnProperty('inRange') && data.hasOwnProperty('ally') && data.inRange && data.ally;

    // Select the cards
    var attackCard = activePage.find('.card-factory-attack');
    var transferCard = activePage.find('.card-factory-transfer');
    var defenceCard = activePage.find('.card-factory-defence');
    var levelCard = activePage.find('.card-factory-level');

    // Update the upgrade buttons
    if(canModify) {
        // Slide down the cards
        transferCard.slideDown();
        defenceCard.slideDown();
        levelCard.slideDown();

        // Get the upgrade button list element, and clear it
        const upgradeButtonList = defenceCard.find('.upgrade-button-list');
        upgradeButtonList.empty();

        // Check whether there are any defence upgrades
        if(!data.hasOwnProperty('defenceUpgrades')) {
            upgradeButtonList.html('<div align="center"><i>No upgrades available...<br></i></div>');

        } else {
            // Loop through the list of upgrades
            data.defenceUpgrades.forEach(function(upgrade, i) {
                // Get an unique button ID
                var buttonId = generateUniqueId('button-upgrade-');

                // Append a button
                upgradeButtonList.append('<a id="' + buttonId + '" class="ui-btn waves-effect waves-button" href="#" data-transition="slide" data-rel="popup">' +
                    '    <i class="zmdi zmdi-plus"></i>&nbsp;' +
                    '    ' + upgrade.name + '&nbsp;&nbsp;<span style="color: gray;">(' + formatMoney(upgrade.cost, true) + ' / +' + upgrade.defence + ')</span>' +
                    '</a>');

                // Get the button
                var button = upgradeButtonList.find('#' + buttonId);

                // Bind a click action
                button.click(function() {
                    showDialog({
                        title: 'Defence upgrade',
                        message: 'Are you sure you want to buy this upgrade for ' + upgrade.cost + ' ' + NameConfig.currency.name + '?<br><br>' +
                        'This will improve the ' + NameConfig.factory.name + ' with ' + upgrade.defence + ' defence.',
                        actions: [
                            {
                                text: 'Buy upgrade',
                                state: 'primary',
                                action: function() {
                                    // Send an upgrade packet
                                    Dworek.realtime.packetProcessor.sendPacket(PacketType.FACTORY_DEFENCE_BUY, {
                                        factory: factoryId,
                                        index: i,
                                        cost: upgrade.cost,
                                        defence: upgrade.defence
                                    });

                                    // Show a notification
                                    showNotification('Buying upgrade...');
                                }
                            },
                            {
                                text: 'Cancel'
                            }
                        ]
                    })
                });
            });
        }

        // Trigger a create on the list
        upgradeButtonList.trigger('create');

        if(data.hasOwnProperty('nextLevelCost')) {
            const levelUpgradeButton = levelCard.find('.action-factory-level-upgrade');
            levelUpgradeButton.unbind('click');
            levelUpgradeButton.click(function() {
                showDialog({
                    title: 'Level upgrade',
                    message: 'Are you sure you want to upgrade one level for ' + data.nextLevelCost + ' ' + NameConfig.currency.name + '?',
                    actions: [
                        {
                            text: 'Buy upgrade',
                            state: 'primary',
                            action: function() {
                                // Send an upgrade packet
                                Dworek.realtime.packetProcessor.sendPacket(PacketType.FACTORY_LEVEL_BUY, {
                                    factory: factoryId,
                                    cost: data.nextLevelCost
                                });

                                // Show a notification
                                showNotification('Buying upgrade...');
                            }
                        },
                        {
                            text: 'Cancel'
                        }
                    ]
                });
            });
        }

        var depositButton = transferCard.find('.action-factory-deposit');
        var withdrawButton = transferCard.find('.action-factory-withdraw');
        depositButton.unbind('click');
        withdrawButton.unbind('click');

        depositButton.click(function() {
            // Determine how many in the user currently has
            var current = 10000;
            if(hasGameData()) {
                var gameData = getGameData();
                if(gameData != null && gameData.hasOwnProperty('balance') && gameData.balance.hasOwnProperty('in'))
                    current = gameData.balance.in;
            }

            // Generate an unique field ID
            var amountFieldId = generateUniqueId('amount-field-');

            // Show the dialog
            showDialog({
                title: 'Deposit ' + NameConfig.in.name,
                message: 'Enter the amount of ' + NameConfig.in.name + ' you\'d like to deposit, or deposit all available to you.<br><br>' +
                '<label for="' + amountFieldId + '">Deposit amount:</label>' +
                '<input type="range" name="' + amountFieldId + '" id="' + amountFieldId + '" value="' + Math.round(current / 2) + '" min="0" max="' + current + '" data-highlight="true">',
                actions: [
                    {
                        text: 'Deposit',
                        state: 'primary',
                        action: function() {
                            // Get the input field value
                            var amount = $('#' + amountFieldId).val();

                            // Send a packet to the server
                            Dworek.realtime.packetProcessor.sendPacket(PacketType.FACTORY_DEPOSIT_IN, {
                                factory: factoryId,
                                amount: amount,
                                all: false
                            });

                            // Show a notification
                            showNotification('Depositing ' + NameConfig.in.name + '...');
                        }
                    },
                    {
                        text: 'Deposit all',
                        action: function() {
                            // Send a packet to the server
                            Dworek.realtime.packetProcessor.sendPacket(PacketType.FACTORY_DEPOSIT_IN, {
                                factory: factoryId,
                                amount: 0,
                                all: true
                            });

                            // Show a notification
                            showNotification('Depositing all ' + NameConfig.in.name + '...');
                        }
                    },
                    {
                        text: 'Leave'
                    }
                ]
            });
        });

        withdrawButton.click(function() {
            // Determine how many in the user currently has
            var current = 10000;
            if(hasFactoryData()) {
                var factoryData = getFactoryData();
                if(factoryData != null && factoryData.hasOwnProperty('out'))
                    current = factoryData.out;
            }

            // Generate an unique field ID
            var amountFieldId = generateUniqueId('amount-field-');

            // Show the dialog
            showDialog({
                title: 'Withdraw ' + NameConfig.out.name,
                message: 'Enter the amount of ' + NameConfig.out.name + ' you\'d like to withdraw, or withdraw all available.<br><br>' +
                '<label for="' + amountFieldId + '">Withdraw amount:</label>' +
                '<input type="range" name="' + amountFieldId + '" id="' + amountFieldId + '" value="' + Math.round(current / 2) + '" min="0" max="' + current + '" data-highlight="true">',
                actions: [
                    {
                        text: 'Withdraw',
                        state: 'primary',
                        action: function() {
                            // Get the input field value
                            var amount = $('#' + amountFieldId).val();

                            // Send a packet to the server
                            Dworek.realtime.packetProcessor.sendPacket(PacketType.FACTORY_WITHDRAW_OUT, {
                                factory: factoryId,
                                amount: amount,
                                all: false
                            });

                            // Show a notification
                            showNotification('Withdrawing ' + NameConfig.out.name + '...');
                        }
                    },
                    {
                        text: 'Withdraw all',
                        action: function() {
                            // Send a packet to the server
                            Dworek.realtime.packetProcessor.sendPacket(PacketType.FACTORY_WITHDRAW_OUT, {
                                factory: factoryId,
                                amount: 0,
                                all: true
                            });

                            // Show a notification
                            showNotification('Withdrawing all ' + NameConfig.out.name + '...');
                        }
                    },
                    {
                        text: 'Leave'
                    }
                ]
            });
        });

    } else {
        // Hide the cards
        if(firstShow) {
            transferCard.hide();
            defenceCard.hide();
            levelCard.hide();
        } else {
            transferCard.slideUp();
            defenceCard.slideUp();
            levelCard.slideUp();
        }
    }

    // Determine whether the attack card should be shown
    if(data.hasOwnProperty('conquerValue') && data.conquerValue > 0 && data.hasOwnProperty('ally') && !data.ally) {
        // Show the attack card
        attackCard.slideDown();

        // Determine whether the factory is going to be destroyed
        const willDestroy = data.hasOwnProperty('level') && data.level <= 1;

        // Get the attack button
        var attackButton = attackCard.find('.action-factory-attack');
        attackButton.unbind('click');

        // Bind the attack button
        attackButton.click(function() {
            // Define the attack message
            var dialogMessage = 'This ' + NameConfig.factory.name + ' will be taken over by your team when you attack it to use for your own production.<br><br>' +
                    'Part of the current ' + NameConfig.in.name + ', ' + NameConfig.out.name + ' and defence in this ' + NameConfig.factory.name + ' will be lost because of this.<br><br>' +
                'Are you sure you want to attack this ' + NameConfig.factory.name + '?';
            if(willDestroy)
                dialogMessage = 'This ' + NameConfig.factory.name + ' will be destroyed when you attack it because it\'s level is too low.<br><br>' +
                    'The current amount of ' + NameConfig.in.name + ' and ' + NameConfig.out.name + ' in this ' + NameConfig.factory.name + ' will be lost.<br><br>' +
                    'Are you sure you want to attack this ' + NameConfig.factory.name + '?';

            // Show the dialog
            showDialog({
                title: 'Attack ' + NameConfig.factory.name,
                message: dialogMessage,
                actions: [
                    {
                        text: 'Attack & ' + (!willDestroy ? 'Take over' : 'Destroy'),
                        icon: 'zmdi zmdi-fire',
                        state: 'primary',
                        action: function() {
                            // Send a packet to the server
                            Dworek.realtime.packetProcessor.sendPacket(PacketType.FACTORY_ATTACK, {
                                game: Dworek.utils.getGameId(),
                                factory: factoryId
                            });

                            // Show a notification
                            showNotification('Attacking ' + NameConfig.in.name + '...');
                        }
                    },
                    {
                        text: 'Cancel'
                    }
                ]
            });
        });

    } else if(!firstShow)
        attackCard.slideUp();
    else
        attackCard.hide();


    // Get the elements
    const factoryNameLabel = activePage.find('.factory-name');
    const factoryLevelLabel = activePage.find('.factory-level');
    const factoryCreatorLabel = activePage.find('.factory-creator');
    const factoryTeamLabel = activePage.find('.factory-team');
    const factoryDefenceLabel = activePage.find('.factory-defence');
    const factoryConquerLabel = activePage.find('.factory-conquer-value');
    const factoryInRangeLabel = activePage.find('.factory-in-range');
    const factoryInLabel = activePage.find('.factory-in');
    const factoryProductionInLabel = activePage.find('.factory-production-in');
    const factoryOutLabel = activePage.find('.factory-out');
    const factoryProductionOutLabel = activePage.find('.factory-production-out');
    const factoryNextLevelCostLabel = activePage.find('.factory-next-level-cost');

    // Create some label constants
    const hiddenLabel = '<span style="color: gray;">Hidden</i>';
    const yesLabel = '<span style="color: green;">Yes</span>';
    const noLabel = '<span style="color: red;">No</span>';

    // Set the name label
    if(!visible || data.hasOwnProperty('name'))
        factoryNameLabel.html(data.name);

    // Set the level label
    if(!visible || data.hasOwnProperty('level'))
        factoryLevelLabel.html(visible ? data.level : hiddenLabel);

    // Set the creator label
    if(!visible || data.hasOwnProperty('creatorName'))
        factoryCreatorLabel.html(visible ? data.creatorName : hiddenLabel);

    // Set the team name label
    if(!visible || data.hasOwnProperty('teamName'))
        // Make the label green/red if it's known whether this factory is from allies or enemies
        if(data.hasOwnProperty('ally'))
            factoryTeamLabel.html('<span style="color: ' + (data.ally ? 'green' : 'red' ) + ';">' + (visible ? data.teamName : 'Hidden') + '</span>');
        else
            factoryTeamLabel.html((visible ? data.teamName : hiddenLabel));

    // Set the defence label
    if(!visible || data.hasOwnProperty('defence'))
        factoryDefenceLabel.html(visible ? data.defence : hiddenLabel);

    // Set the conquer value label
    if(!visible || data.hasOwnProperty('conquerValue')) {
        if(!visible)
            factoryConquerLabel.html(hiddenLabel);
        else {
            // Create a suffix label
            var suffix = '';
            if(data.hasOwnProperty('conquerUserCount'))
                suffix = ' <span style="color: gray;">by ' + data.conquerUserCount + ' user' + (data.conquerUserCount != 1 ? 's' : '') + ' in range</span>';

            // Set the label
            if(data.conquerValue < -5)
                factoryConquerLabel.html('<span style="color: green;">' +  data.conquerValue + '</span>' + suffix);
            else if(data.conquerValue <= 0)
                factoryConquerLabel.html('<span style="color: orangered;">' +  data.conquerValue + '</span>' + suffix);
            else
                factoryConquerLabel.html('<span class="animated infinite rubberBand" style="color: red; display: inline-block;">' +  data.conquerValue + '</span>' + suffix);
        }
    }

    // Set the range label
    if(!visible || data.hasOwnProperty('inRange'))
        factoryInRangeLabel.html(data.inRange ? yesLabel : noLabel);

    // Set the in label
    if(!visible || data.hasOwnProperty('in'))
        if(data.hasOwnProperty('productionIn')) {
            if(data.in >= data.productionIn)
                factoryInLabel.html(visible ? ('<span style="color: green;">' + formatGoods(data.in) + '</span>') : hiddenLabel);
            else
                factoryInLabel.html(visible ? ('<span class="animated infinite rubberBand" style="color: red; display: inline-block;">' + formatGoods(data.in) + '</span>') : hiddenLabel);
        } else
            factoryInLabel.html(visible ? formatGoods(data.in) : hiddenLabel);

    // Set the production in label
    if(visible && data.hasOwnProperty('productionIn')) {
        factoryProductionInLabel.html('− ' + formatGoods(data.productionIn) + ' / tick');
        factoryProductionInLabel.show();
    } else if(!visible)
        factoryProductionInLabel.hide();

    // Set the out label
    if(!visible || data.hasOwnProperty('out'))
        factoryOutLabel.html(visible ? formatGoods(data.out) : hiddenLabel);

    // Set the production out label
    if(visible && data.hasOwnProperty('productionOut')) {
        factoryProductionOutLabel.html('+ ' + formatGoods(data.productionOut) + ' / tick');
        factoryProductionOutLabel.show();
    } else if(!visible)
        factoryProductionOutLabel.hide();

    // Set the next level cost label
    if(!visible || data.hasOwnProperty('nextLevelCost'))
        factoryNextLevelCostLabel.html(canModify ? formatMoney(data.nextLevelCost, true) : '?');
}

/**
 * Toggle full screen mode for the app.
 */
function toggleFullScreen() {
    if(!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {  // current working methods
        if(document.documentElement.requestFullscreen)
            document.documentElement.requestFullscreen();
        else if(document.documentElement.msRequestFullscreen)
            document.documentElement.msRequestFullscreen();
        else if(document.documentElement.mozRequestFullScreen)
            document.documentElement.mozRequestFullScreen();
        else if(document.documentElement.webkitRequestFullscreen)
            document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        else
            showNotification('Full screen is not supported on this device');
    } else {
        if(document.exitFullscreen)
            document.exitFullscreen();
        else if(document.msExitFullscreen)
            document.msExitFullscreen();
        else if(document.mozCancelFullScreen)
            document.mozCancelFullScreen();
        else if(document.webkitExitFullscreen)
            document.webkitExitFullscreen();
        else
            showNotification('Full screen is not supported on this device');
    }
}

// Flush all other pages when visiting the login/register page
$(document).bind('pageshow', function() {
    // Make sure the user is on a login/register page
    if(document.location.pathname.trim().match(/^\/(login|register)/) == null)
        return;

    // Flush all pages
    Dworek.utils.flushPages(undefined, false);
});

/**
 * Format a big number to make it more readable.
 *
 * @param {Number} num Number to format.
 * @returns {string} Formatted number.
 */
function formatBigNumber(num) {
    // Split the number by a dot (for decimal numbers)
    const parts = num.toString().split(".");

    // Put comma's in it
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    // Join the decimal number and return
    return parts.join(".");
}

/**
 * Format money.
 *
 * @param {Number} amount Amount of money.
 * @param {boolean} [prefixSign=true] True to prefix a money sign, false to not.
 * @returns {string} Formatted money string.
 */
function formatMoney(amount, prefixSign) {
    // Set the parameter defaults
    if(prefixSign == undefined)
        prefixSign = true;

    // Format the amount of money
    amount = formatBigNumber(amount);

    // Return the number, prefix the money sign if specified
    return (prefixSign ? NameConfig.currency.sign : '') + amount;
}

/**
 * Format the given amount of goods to make it better readable.
 *
 * @param {Number} amount Amount of goods.
 * @returns {string} Formatted amount of goods.
 */
function formatGoods(amount) {
    return formatBigNumber(amount);
}
