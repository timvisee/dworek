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

    // Create a function to send a response to the client
    const sendResponse = function(authenticated) {
        // Send a response to the client
        Core.realTime.packetProcessor.sendPacket(PacketType.AUTH_RESPONSE, {
            authenticated: authenticated
        }, socket);
    };

    // Trim the session token
    const sessionToken = rawSession.trim().toLowerCase();

    // Return a success packet if the session is empty
    if(sessionToken.length == 0) {
        sendResponse(false);

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

        // Send a response
        sendResponse(isValid);

        // Show a status message
        console.log('Authenticated real time client (valid: ' + isValid + ', session: ' + sessionToken + ')');
    });
};

// Export the module
module.exports = AuthenticationRequestHandler;
