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

var io = require('socket.io');
var path = require('path');
var fs = require('fs');
var mongo = require('mongodb');
var ObjectId = mongo.ObjectId;

var config = require('../../config');

var Core = require('../../Core');
var PacketProcessor = require('./PacketProcessor');
var UserModel = require('../model/user/UserModel');

/**
 * Directory of the handlers.
 * @type {string} Directory.
 */
const HANDLERS_DIRECTORY = './handler';

/**
 * Real time class.
 *
 * @class
 * @constructor
 */
var RealTime = function() {
    /**
     * Packet processor instance.
     * @type {PacketProcessor}
     */
    this.packetProcessor = new PacketProcessor();

    /**
     * SocketIO server instance.
     * @type {Server}
     * @private
     */
    this._io = null;

    /**
     * Create a flag to define whether the server is online.
     *
     * @type {boolean}
     * @private
     */
    this._online = false;

    /**
     * Create a new broadcast map queue.
     *
     * @type {Map} Map containing all queued broadcasts.
     * @private
     */
    this._broadcastQueue = new Map();
};

/**
 * Start the real time server.
 */
RealTime.prototype.start = function() {
    // Create the SocketIO server
    this._io = io({
        // Serve the SocketIO client to users
        serveClient: true,

        // Set the real time SocketIO server path
        path: config.realtime.path
    });

    // Attach the SocketIO server to the running HTTP server
    if(config.realtime.port == undefined || config.realtime.port === config.web.port)
        // Bind the real time SocketIO server to the HTTP web server
        this._io.attach(Core.server);
    else
        // Bind the real time SocketIO server to the specified port
        this._io.attach(config.realtime.port);

    // Set the online flag
    this._online = true;

    // Register all handlers
    this.registerHandlers();

    // Store this instance
    const self = this;

    // Register the connection event
    this._io.on('connection', function(socket) {
        // Show a status message
        console.log('A client connected to the real time server, setting things up');

        // Listen for packets from the client
        socket.on(config.realtime.defaultRoom, function(rawPacket) {
            self.packetProcessor.receivePacked(rawPacket, socket);
        });
    });
};

/**
 * Check whether the real time server is online.
 */
RealTime.prototype.isOnline = function() {
    return this._online;
};

/**
 * Get the number of connected clients.
 *
 * @return {Number} Number of connected clients.
 */
RealTime.prototype.getConnectionCount = function() {
    //noinspection JSUnresolvedVariable
    return this._io.engine.clientsCount;
};
/**
 * Get the packet processor.
 *
 * @returns {PacketProcessor} Packet processor instance.
 */
RealTime.prototype.getPacketProcessor = function() {
    return this.packetProcessor;
};

/**
 * Load and register all custom packet handlers.
 *
 * @return {Number} Number of loaded custom handlers.
 */
RealTime.prototype.registerHandlers = function() {
    // Show a status message
    console.log('Registering packet handlers...');

    // Normalize the path
    const normalizedPath = path.join(__dirname, HANDLERS_DIRECTORY);

    // Keep track of the handler count
    var handlerCount = 0;

    // Read the directory for handlers, and initialize them
    fs.readdirSync(normalizedPath).forEach(function(file) {
        // Show a status message
        console.log('Loading and registering ' + file + ' handler...');

        // Require the file
        const handler = require(HANDLERS_DIRECTORY + '/' + file);

        // Dynamically create a handler instance
        new handler(true);

        // Increase the handler count
        handlerCount++;
    });

    // Return the handler count
    return handlerCount;
};

/**
 * Queue a broadcast.
 *
 * @param {Object} broadcastObject Broadcast object.
 * @param {UserModel|ObjectId|string} user User instance or user ID to queue the broadcast for.
 */
RealTime.prototype.queueBroadcast = function(broadcastObject, user) {
    // Get the current broadcasts
    var broadcasts = this.getBroadcasts(user);

    // Add the broadcast to the list
    broadcasts.push(broadcastObject);

    // Get the user ID as a string
    if(user instanceof UserModel)
        user = user.getIdHex().toLowerCase();
    else if(user instanceof ObjectId)
        user = user.toString().toLowerCase();
    else
        user = user.toString().toLowerCase();

    // Set the broadcasts
    this._broadcastQueue.set(user, broadcasts);
};

/**
 * Get the queued broadcasts for the given user.
 *
 * @param {UserModel|ObjectId|string} user User instance or user ID to get the broadcasts for.
 * @return {Array} Array of queued broadcasts. An empty array is returned if there are no queued broadcasts.
 */
RealTime.prototype.getBroadcasts = function(user) {
    // Return an empty array if the user doesn't have broadcasts
    if(!this.hasBroadcasts(user))
        return [];

    // Get the user ID as a string
    if(user instanceof UserModel)
        user = user.getIdHex().toLowerCase();
    else if(user instanceof ObjectId)
        user = user.toString().toLowerCase();
    else
        user = user.toString().toLowerCase();

    // Return the broadcasts for this user
    return this._broadcastQueue.get(user);
};

/**
 * Determine whether the given user has any queued broadcasts.
 *
 * @param {UserModel|ObjectId|string} user User instance or the ID of a user.
 * @return {boolean} True if the user has any queued broadcasts, false if not.
 */
RealTime.prototype.hasBroadcasts = function(user) {
    // Get the user ID as a string
    if(user instanceof UserModel)
        user = user.getIdHex().toLowerCase();
    else if(user instanceof ObjectId)
        user = user.toString().toLowerCase();
    else
        user = user.toString().toLowerCase();

    // Return the result
    return this._broadcastQueue.has(user);
};

/**
 * Resolve the broadcast with the given token.
 *
 * @param {UserModel|ObjectId|string} user User instance or user ID to resolve the broadcasts for.
 * @param {string} token Broadcast token.
 */
RealTime.prototype.resolveBroadcast = function(user, token) {
    // Get the user ID as a string
    if(user instanceof UserModel)
        user = user.getIdHex().toLowerCase();
    else if(user instanceof ObjectId)
        user = user.toString().toLowerCase();
    else
        user = user.toString().toLowerCase();

    // Get the list of broadcasts
    var broadcasts = this.getBroadcasts(user);

    // Determine the index to remove
    var removeIndex = -1;

    // Loop through the list of broadcasts to find the correct one
    broadcasts.forEach(function(broadcast, i) {
        // Compare the token
        if(broadcast.token == token)
            removeIndex = i;
    });

    // Delete the broadcast
    if(removeIndex >= 0)
        broadcasts.splice(removeIndex, 1);

    // Update the list of broadcasts
    this._broadcastQueue.set(user, broadcasts);
};

/**
 * Resolve all broadcasts for the given user.
 *
 * @param {UserModel|ObjectId|string} user User instance or user ID to resolve the broadcasts for.
 */
RealTime.prototype.resolveAllBroadcasts = function(user) {
    // Get the user ID as a string
    if(user instanceof UserModel)
        user = user.getIdHex().toLowerCase();
    else if(user instanceof ObjectId)
        user = user.toString().toLowerCase();
    else
        user = user.toString().toLowerCase();

    // Delete the objects
    this._broadcastQueue.delete(user);
};

// Export the module
module.exports = RealTime;