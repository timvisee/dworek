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
var CallbackLatch = require('../../util/CallbackLatch');

/**
 * Type of packets to handle by this handler.
 * @type {number} Packet type.
 */
const HANDLER_PACKET_TYPE = PacketType.GAME_STAGE_CHANGE;

/**
 * Game change state handler.
 *
 * @param {boolean=false} init True to initialize after constructing.
 *
 * @class
 * @constructor
 */
var GameChangeStageHandler = function(init) {
    // Initialize
    if(init)
        this.init();
};

/**
 * Initialize the handler.
 */
GameChangeStageHandler.prototype.init = function() {
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
GameChangeStageHandler.prototype.handler = function(packet, socket) {
    // Make sure a session is given
    if(!packet.hasOwnProperty('game') || !packet.hasOwnProperty('stage')) {
        console.log('Received malformed packet, game stage change packet doesn\'t contain game/stage data');
        return;
    }

    // Get the game and stage
    const rawGame = packet.game;
    const rawStage = packet.stage;

    // Validate the game stage
    if(rawStage < 1 || rawStage > 2) {
        // Send a message response to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to change game stage.',
            dialog: true
        }, socket);
        return;
    }

    // Parse the stage value
    const stage = parseInt(rawStage, 10);

    // Make sure the user is authenticated
    if(!_.has(socket, 'session.valid') || !socket.session.valid) {
        // Send a message response to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to change game stage, you\'re not authenticated.',
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
                message: 'Failed to change game stage.',
                dialog: true
            }, socket);
            return;
        }

        // Create a callback latch
        var latch = new CallbackLatch();

        // Make sure the user has management rights
        latch.add();
        game.hasManagePermission(user, function(err, hasPermission) {
            // Handle errors
            if(err !== null || game == null) {
                // Print the error to the console
                console.error(err);

                // Send a message response to the user
                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                    error: true,
                    message: 'Failed to change game stage.',
                    dialog: true
                }, socket);
                return;
            }

            // Make sure the user has permission
            if(!hasPermission) {
                // Send a message response to the user
                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                    error: true,
                    message: 'You don\'t have permission to change the game stage.',
                    dialog: true
                }, socket);
                return;
            }

            // Resolve the latch
            latch.resolve();
        });

        // Make sure the stage is changing
        latch.add();
        game.getStage(function(err, result) {
            // Handle errors
            if(err !== null) {
                // Print the error to the console
                console.error(err);

                // Send a message response to the user
                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                    error: true,
                    message: 'Failed to change game stage.',
                    dialog: true
                }, socket);
                return;
            }

            // Make sure the game stage will be changed
            if(stage == result) {
                // Send a message response to the user
                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                    error: true,
                    message: 'Failed to change the game stage, the game is already in this stage.',
                    dialog: true
                }, socket);
                return;
            }

            // Resolve the latch
            latch.resolve();
        });

        // Continue when we're done
        latch.then(function() {
            // Set the game stage
            game.setStage(stage, function(err) {
                // Handle errors
                if(err !== null) {
                    // Send a message response to the user
                    Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                        error: true,
                        message: 'You don\'t have permission to change the game stage.',
                        dialog: true
                    }, socket);
                    return;
                }

                // Get the name of the game
                game.getName(function(err, gameName) {
                    // Handle errors
                    if(err !== null)
                        gameName = 'Unknown';





                    // TODO: Update all relevant users, the stage of this game changed!
                    // TODO: Remove this dummy response
                    Core.realTime.packetProcessor.sendPacket(PacketType.GAME_STAGE_CHANGED, {
                        game: game.getIdHex(),
                        gameName,
                        stage,
                        joined: true
                    }, socket);





                });
            });
        });
    });
};

// Export the module
module.exports = GameChangeStageHandler;
