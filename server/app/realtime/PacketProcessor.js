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

/**
 * Packet parser class.
 *
 * @class
 * @constructor
 */
var PacketProcessor = function() {
    /**
     * Map containing all input handlers.
     * @type {Map}
     * @private
     */
    this._handlers = new Map();
};

/**
 * Process a raw packet.
 *
 * @param {Object} rawPacket Raw packet to process.
 */
PacketProcessor.prototype.process = function(rawPacket) {
    // Make sure the packet is an object
    if(!_.isObject(rawPacket)) {
        console.log('Received malformed packet, packet isn\'t an object, ignoring');
        return;
    }

    // Make sure the raw packet contains a type property
    if(!rawPacket.hasOwnProperty('type')) {
        console.log('Received malformed packet, packet doesn\'t contain type, ignoring');
        return;
    }

    // Get the packet type
    const packetType = rawPacket.type;

    // Invoke all packet handlers for this packet
    this.invokeHandlers(rawPacket, packetType);
};

/**
 * Register a packet handler.
 *
 * @param {Number} packetType Packet type value.
 * @param {function} packetHandler Handler callback.
 */
PacketProcessor.prototype.registerHandler = function(packetType, packetHandler) {
    // Create a variable to put the handler array in for this packet type
    var handlers = [];

    // Get the current handlers from the map
    if(this._handlers.has(packetType))
        handlers = this._handlers.get(packetType);

    // Push the handler in the array
    handlers.push(packetHandler);

    // Put the array of handlers back into the handlers map
    this._handlers.set(packetType, handlers);
};

/**
 * Get the packet handlers for the given packet type.
 *
 * @param {Number} packetType Packet type.
 * @returns {Array} Array of packet handlers,
 * will be an empty array if there's no registered handler for the given packet type.
 */
PacketProcessor.prototype.getHandlers = function(packetType) {
    // Make sure there's a map entry for this packet type
    if(!this._handlers.has(packetType))
        return [];

    // Get and return the array of handlers for this type
    return this._handlers.get(packetType);
};

/**
 * Invoke all packet handlers for the given packet type, with the given packet.
 *
 * @param {Object} packet Packet object.
 * @param {Number} packetType Packet type.
 */
PacketProcessor.prototype.invokeHandlers = function(packet, packetType) {
    // Get the handlers for this packet type
    const handlers = this.getHandlers(packetType);

    // Loop through all the handlers
    handlers.forEach(function(handler) {
        // Call the handler
        handler(packet);
    });
};
