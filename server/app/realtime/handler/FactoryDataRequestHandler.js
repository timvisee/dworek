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
var Coordinate = require('../../coordinate/Coordinate');
var CallbackLatch = require('../../util/CallbackLatch');

/**
 * Type of packets to handle by this handler.
 * @type {number} Packet type.
 */
const HANDLER_PACKET_TYPE = PacketType.FACTORY_DATA_REQUEST;

/**
 * Factory data request handler.
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
    // Make sure we only call back once
    var calledBack = false;

    // Create a function to call back an error
    const callbackError = function() {
        // Only call back once
        if(calledBack)
            return;

        // Send a message to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to load factory data, an error occurred.',
            dialog: true
        }, socket);

        // Set the called back flag
        calledBack = true;
    };

    // Make sure a session is given
    if(!packet.hasOwnProperty('factory')) {
        callbackError();
        return;
    }

    // Get the factory
    const rawFactory = packet.factory;

    // Make sure the user is authenticated
    if(!_.has(socket, 'session.valid') || !socket.session.valid) {
        // Send a message response to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed load game data, you\'re not authenticated.',
            dialog: true
        }, socket);
        return;
    }

    // Get the user
    const user = socket.session.user;

    // Validate the factory
    Core.model.factoryModelManager.isValidFactoryId(rawFactory, function(err, valid) {
        // Call back errors
        if(err !== null || !valid) {
            callbackError();
            return;
        }

        // Create a factory instance
        const factoryModel = Core.model.factoryModelManager._instanceManager.create(rawFactory);

        // Get the game
        factoryModel.getGame(function(err, game) {
            // Call back errors
            if(err !== null || !valid) {
                callbackError();
                return;
            }

            // Get the live game
            Core.gameController.getGame(game, function(err, liveGame) {
                // Call back errors
                if(err !== null || liveGame == null) {
                    callbackError();
                    return;
                }

                // Get the live factory
                liveGame.factoryManager.getFactory(factoryModel, function(err, liveFactory) {
                    // Call back errors
                    if(err !== null || liveFactory == null) {
                        callbackError();
                        return;
                    }

                    // Send the factory data to the user
                    liveFactory.sendData(user, socket, function(err) {
                        // Call back errors
                        if(err !== null)
                            callbackError();
                    });
                });
            });
        });
    });

    // Get the game instance by it's ID
    Core.model.gameModelManager.getGameById(rawGame, function(err, game) {
        // Handle errors
        if(err !== null || game == null) {
            // Print the error to the console
            console.error(err);

            // Call back an error
            callbackError();
            return;
        }

        // Create a callback latch
        var latch = new CallbackLatch();

        // Send the game data to the user
        Core.gameController.sendGameData(game, user, socket, function(err) {
            // Call back errors
            if(err !== null)
                callbackError();
        });
    });
};

// Export the module
module.exports = GameChangeStageHandler;
