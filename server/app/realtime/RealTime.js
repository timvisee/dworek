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

var config = require('../../config');

var Core = require('../../Core');
var PacketProcessor = require('./PacketProcessor');

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

// Export the module
module.exports = RealTime;