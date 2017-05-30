/******************************************************************************
 * Copyright (c) Dworek 2017. All rights reserved.                            *
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
var StatusUtils = require('../../util/StatusUtils');

/**
 * Type of packets to handle by this handler.
 * @type {number} Packet type.
 */
const HANDLER_PACKET_TYPE = PacketType.APP_STATUS_REQUEST;

/**
 * Status request handler.
 *
 * @param {boolean=false} init True to initialize after constructing.
 *
 * @class
 * @constructor
 */
var StatusRequestHandler = function(init) {
    // Initialize
    if(init)
        this.init();
};

/**
 * Initialize the handler.
 */
StatusRequestHandler.prototype.init = function() {
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
StatusRequestHandler.prototype.handler = function(packet, socket) {
    // Make sure we only call back once
    var calledBack = false;

    // Create a function to call back an error
    const callbackError = function() {
        // Only call back once
        if(calledBack)
            return;

        // Set the called back flag
        calledBack = true;

        // Send a message to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to fetch status update.',
            dialog: false,
            toast: true
        }, socket);
    };

    // Get the status object
    StatusUtils.getStatus(function(err, status) {
        // Handle errors
        if(err !== null) {
            callbackError();
            return;
        }

        // Send the status update packet to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.APP_STATUS_UPDATE, {
            status
        }, socket);
    });
};

// Export the module
module.exports = StatusRequestHandler;
