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
const HANDLER_PACKET_TYPE = PacketType.BROADCAST_RESOLVE;

/**
 * Authentication request handler.
 *
 * @param {boolean=false} init True to initialize after constructing.
 *
 * @class
 * @constructor
 */
var BroadcastResolveAllHandler = function(init) {
    // Initialize
    if(init)
        this.init();
};

/**
 * Initialize the handler.
 */
BroadcastResolveAllHandler.prototype.init = function() {
    // Make sure the real time instance is initialized
    if(Core.realTime === null)
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
BroadcastResolveAllHandler.prototype.handler = function(packet, socket) {
    // Make sure a session is given
    if(!packet.hasOwnProperty('token')) {
        console.log('Received malformed packet, broadcast resolve packet doesn\'t contain token');
        return;
    }

    // Get the token
    const token = packet.token.trim();

    // Make sure the user is authenticated
    if(!_.has(socket, 'session.valid') || !socket.session.valid)
        return;

    // Get the user
    const user = socket.session.user;

    // Resolve the broadcasts for this user
    Core.realTime.resolveBroadcast(user.getIdHex(), token);
};

// Export the module
module.exports = BroadcastResolveAllHandler;
