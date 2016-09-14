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
var mongo = require('mongodb');
var ObjectId = mongo.ObjectId;

var config = require('../../config');

var Core = require('../../Core');
var UserModel = require('../model/user/UserModel');
var User = require('../live/user/User');

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
 * Process a received raw packet.
 *
 * @param {Object} rawPacket Raw packet to process.
 * @param socket SocketIO socket this packet was received from.
 */
PacketProcessor.prototype.receivePacked = function(rawPacket, socket) {
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
    this.invokeHandlers(rawPacket, packetType, socket);
};

/**
 * Send a packet object to the given
 *
 * @param {Number} packetType Packet type value.
 * @param {Object} packet Packet object to send.
 * @param socket SocketIO socket to send the packet over.
 */
PacketProcessor.prototype.sendPacket = function(packetType, packet, socket) {
    // Put the packet type in the packet object
    packet.type = packetType;

    // Send the packet over the socket
    socket.emit(config.realtime.defaultRoom, packet);
};

/**
 * Send a packet to the given user.
 *
 * @param {Number} packetType Packet type value.
 * @param {Object} packet Packet object to send.
 * @param {UserModel|ObjectId|string} user User instance or user ID to send the packet to.
 * @param {Object} [options] Options object.
 * @param {boolean} [options.once=false] True to only send a packet to one socket, false to send to multiple if available.
 * @return {Number} Number of sockets the packet was send to.
 */
PacketProcessor.prototype.sendPacketUser = function(packetType, packet, user, options) {
    // Get the user ID as an ObjectId
    if(user instanceof UserModel || user instanceof User)
        user = user.getId();
    else if(!(user instanceof ObjectId) && ObjectId.isValid(user))
        user = new ObjectId(user);
    else if(!(user instanceof ObjectId))
        throw Error('Invalid user ID');

    // Determine whether to send the packet once
    var once = false;
    if(options !== undefined && options.hasOwnProperty('once'))
        once = !!options.once;

    // Put the packet type in the packet object
    packet.type = packetType;

    // Count the number of found clients
    var found = 0;

    // Loop through all connected clients to find the correct ones
    Object.keys(Core.realTime._io.sockets.sockets).forEach(function(socketId) {
        // Skip if we only should send once and we found one
        if(once && found >= 1)
            return;

        // Get the socket
        const entrySocket = Core.realTime._io.sockets.sockets[socketId];

        // Skip the socket if not authenticated
        if(!_.has(entrySocket, 'session.valid') || !_.has(entrySocket, 'session.user') || !entrySocket.session.valid)
            return;

        // Compare the user and skip if it isn't the correct user
        if(!entrySocket.session.user.getId().equals(user.getId()))
            return;

        // Send the packet over the socket
        entrySocket.emit(config.realtime.defaultRoom, packet);

        // Increase the found counter
        found++;
    });

    // Return the number of found sockets
    return found;
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
 * @param socket SocketIO socket.
 */
PacketProcessor.prototype.invokeHandlers = function(packet, packetType, socket) {
    // Get the handlers for this packet type
    const handlers = this.getHandlers(packetType);

    // Loop through all the handlers
    handlers.forEach(function(handler) {
        // Call the handler
        handler(packet, socket);
    });
};

// Export the module
module.exports = PacketProcessor;
