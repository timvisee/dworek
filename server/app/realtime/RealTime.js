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

var config = require('../../config');

var Core = require('../../Core');
var PacketProcessor = require('./PacketProcessor');

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
        // Bind the realtime SocketIO server to the HTTP web server
        this._io.attach(Core.server);
    else
        // Bind the realtime SocketIO server to the specified port
        this._io.attach(config.realtime.port);

    // Set the online flag
    this._online = true;

    // Register the connection event
    this._io.on('connection', function(socket) {
        // Show a status message
        console.log('A client connected to the real time server');

        // Send a test message to the client socket
        socket.emit('test', {
            message: 'Test message'
        });
    });

    // Store this instance
    const self = this;

    // Register all handlers
    this.registerHandlers();

    // Handle packets through the packet processor
    console.log('Listening for packets...');
    this._io.on(config.realtime.defaultRoom, self.getPacketProcessor().process);
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

// Export the module
module.exports = RealTime;