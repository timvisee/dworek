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

var _ = require('lodash');

var Core = require('../../../Core');
var PacketType = require('../PacketType');

/**
 * Type of packets to handle by this handler.
 * @type {number} Packet type.
 */
const HANDLER_PACKET_TYPE = PacketType.AUTH_REQUEST;

/**
 * Authentication request handler.
 *
 * @param {boolean=false} init True to initialize after constructing.
 *
 * @class
 * @constructor
 */
var AuthenticationRequestHandler = function(init) {
    // Initialize
    if(init)
        this.init();
};

/**
 * Initialize the handler.
 */
AuthenticationRequestHandler.prototype.init = function() {
    // Make sure the real time instance is initialized
    if(Core.realTime == null)
        throw new Error('Real time server not initialized yet');

    // Register the handler
    Core.realTime.getPacketProcessor().registerHandler(HANDLER_PACKET_TYPE, this.handler);
};

/**
 * Handle the packet.
 *
 * @param {Object} packet Packet object.
 * @param socket SocketIO socket.
 */
AuthenticationRequestHandler.prototype.handler = function(packet, socket) {
    // Make sure a session is given
    if(!packet.hasOwnProperty('session')) {
        console.log('Received malformed packet, authentication packet doesn\'t contain user data');
        return;
    }

    // Get the session value
    const rawSession = packet.session;

    // Trim the session token
    const sessionToken = rawSession.trim().toLowerCase();

    // Return a success packet if the session is empty
    if(sessionToken.length == 0) {
        // Send a response to the client
        Core.realTime.packetProcessor.sendPacket(PacketType.AUTH_RESPONSE, {
            loggedIn: false
        }, socket);

        // Set the session state in the socket
        if(!_.has(socket, 'session'))
            socket.session = {};

        // Set the logged in state
        socket.session.valid = false;

        // Show a status message
        console.log('Authenticated real time client (no session)');
        return;
    }

    // Validate the session
    Core.model.sessionModelManager.getSessionUserByTokenIfValid(sessionToken, function(err, user) {
        // Determine whether the session is valid
        var isValid = user !== null;

        // Handle errors
        if(err !== null) {
            // Failed to validate session, show the error in the console
            console.error('Failed to validate session, invalidating session for security reasons');

            // Set the authentication result to false
            isValid = false;
        }

        // Create the packet object
        var packetObject = {
            loggedIn: isValid,
            valid: isValid
        };

        // Set the user if there is any
        if(isValid)
            packetObject.user = user.getIdHex();

        // Send a response to the client
        Core.realTime.packetProcessor.sendPacket(PacketType.AUTH_RESPONSE, packetObject, socket);

        // Set the session state in the socket
        if(!_.has(socket, 'session'))
            socket.session = {};

        // Set the logged in state and user
        socket.session.valid = isValid;
        socket.session.userId = user.getIdHex();
        socket.session.user = user;

        // TODO: Invalidate other sessions with this user!

        // Show a status message
        console.log('Authenticated real time client (valid: ' + isValid + ', session: ' + sessionToken + ')');

        // Check whether this user has any queued broadcasts
        if(Core.realTime.hasBroadcasts(user.getIdHex().toLowerCase())) {
            // Get the list of broadcasts
            var broadcasts = Core.realTime.getBroadcasts(user.getIdHex().toLowerCase());

            // Loop through the broadcasts
            broadcasts.forEach(function(broadcast) {
                // Get the game name for this broadcast
                Core.model.gameModelManager.getGameById(broadcast.game, function(err, gameName) {
                    // Handle errors
                    if(err !== null) {
                        console.error('An error occurred while fetching a game name, ignoring.');
                        return;
                    }

                    // Append the game name to the broadcast
                    broadcast.gameName = gameName;

                    // Send a broadcast to the socket
                    Core.realTime.packetProcessor.sendPacket(PacketType.BROADCAST_MESSAGE, broadcast, socket);
                });
            });
        }
    });
};

// Export the module
module.exports = AuthenticationRequestHandler;
