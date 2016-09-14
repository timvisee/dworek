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
const HANDLER_PACKET_TYPE = PacketType.BROADCAST_MESSAGE_REQUEST;

/**
 * Authentication request handler.
 *
 * @param {boolean=false} init True to initialize after constructing.
 *
 * @class
 * @constructor
 */
var BroadcastMessageHandler = function(init) {
    // Initialize
    if(init)
        this.init();
};

/**
 * Initialize the handler.
 */
BroadcastMessageHandler.prototype.init = function() {
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
BroadcastMessageHandler.prototype.handler = function(packet, socket) {
    // Make sure a session is given
    if(!packet.hasOwnProperty('message') && !packet.hasOwnProperty('game')) {
        console.log('Received malformed packet, broadcast packet doesn\'t contain message or game');
        return;
    }

    // Get the message to broadcast and the raw game
    const message = packet.message.trim();
    const rawGame = packet.game;

    // Make sure the user is authenticated
    if(!_.has(socket, 'session.valid') || !socket.session.valid) {
        // Send a message response to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to broadcast message, you\'re not authenticated.',
            dialog: true
        }, socket);
        return;
    }

    // Get the user
    const user = socket.session.user;

    // Get the game instance by it's ID
    Core.model.gameModelManager.getGameById(rawGame, function(err, game) {
        // Handle errors
        if(err !== null || game == null) {
            // Print the error to the console
            console.error(err);

            // Send a message response to the user
            Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                error: true,
                message: 'Failed to broadcast message',
                dialog: true
            }, socket);
            return;
        }

        // Make sure the user has management rights
        game.hasManagePermission(user, function(err, hasPermission) {
            // Handle errors
            if(err !== null || game == null) {
                // Print the error to the console
                console.error(err);

                // Send a message response to the user
                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                    error: true,
                    message: 'Failed to broadcast message.',
                    dialog: true
                }, socket);
                return;
            }

            // Make sure the user has permission
            if(!hasPermission) {
                // Send a message response to the user
                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                    error: true,
                    message: 'You don\'t have permission to broadcast a message.',
                    dialog: true
                }, socket);
                return;
            }

            // Get all users that joined this game
            Core.model.gameUserModelManager.getGameUsers(game, function(err, users) {
                // Send error responses
                if(err !== null) {
                    Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                        error: true,
                        message: 'An error occurred while sending a broadcast.',
                        dialog: true
                    }, socket);
                    return;
                }

                // Create the broadcast object
                var broadcastObject = {
                    message,
                    game: game.getIdHex()
                };

                // Loop through the list of users
                users.forEach(function(user) {
                    // Add the user, and their broadcast to the broadcast queue
                    Core.realTime.queueBroadcast(broadcastObject, user.getIdHex().toLowerCase());
                });

                // Get the name of the game
                game.getName(function(err, gameName) {
                    // Handle errors
                    if(err !== null)
                        gameName = 'Unknown';

                    // Set the game name in the broadcast object
                    broadcastObject.gameName = gameName;

                    // Loop through all connected clients, to send the game stage update
                    Object.keys(Core.realTime._io.sockets.sockets).forEach(function(socketId) {
                        // Get the socket
                        const entrySocket = Core.realTime._io.sockets.sockets[socketId];

                        // Skip the socket if not authenticated
                        if(!_.has(entrySocket, 'session.valid') || !_.has(entrySocket, 'session.user') || !entrySocket.session.valid)
                            return;

                        // Get the user
                        const user = entrySocket.session.user;

                        // Check whether the user joined this game
                        game.hasUser(user, function(err, joined) {
                            // Skip this socket if an error occurred
                            if(err !== null)
                                return;

                            // Make sure the user joined
                            if(!joined)
                                return;

                            // Send a broadcast packet to the user
                            Core.realTime.packetProcessor.sendPacket(PacketType.BROADCAST_MESSAGE, broadcastObject, entrySocket);
                        });
                    });
                });
            });
        });
    });
};

// Export the module
module.exports = BroadcastMessageHandler;
