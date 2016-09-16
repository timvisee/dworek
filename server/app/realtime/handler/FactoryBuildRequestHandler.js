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
var Validator = require('../../validator/Validator');
var FactoryDatabase = require('../../model/factory/FactoryDatabase');

/**
 * Type of packets to handle by this handler.
 * @type {number} Packet type.
 */
const HANDLER_PACKET_TYPE = PacketType.FACTORY_BUILD_REQUEST;

/**
 * Location update handler.
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
            message: 'Failed to build factory, an error occurred.',
            dialog: true
        }, socket);

        // Set the called back flag
        calledBack = true;
    };

    // Make sure a session is given
    if(!packet.hasOwnProperty('game') || !packet.hasOwnProperty('name')) {
        console.log('Received malformed packet, factory build packet does not contain required data');
        callbackError();
        return;
    }

    // Get the game and name
    const rawGame = packet.game;
    const rawName = packet.name;

    // Make sure the user is authenticated
    if(!_.has(socket, 'session.valid') || !socket.session.valid) {
        // Send a message response to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to send your location, you\'re not authenticated.',
            dialog: true
        }, socket);
        return;
    }

    // Get the user
    const user = socket.session.user;

    // Validate the name
    if(!Validator.isValidFactoryName(rawName)) {
        // Send a message response to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to build factory, this factory name is not allowed.',
            dialog: true
        }, socket);
        return;
    }

    // Format the name
    const factoryName = Validator.formatFactoryName(rawName);

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

        // Make sure the game is active
        game.getStage(function(err, stage) {
            // Call back errors
            if(err !== null || stage != 1) {
                callbackError();
                return;
            }

            // Get the live game instance
            Core.gameController.getGame(game, function(err, liveGame) {
                // Call back errors
                if(err !== null || liveGame == null) {
                    callbackError();
                    return;
                }

                // Get the game user
                liveGame.getUser(user, function(err, liveUser) {
                    // Call back errors
                    if(err !== null || liveUser == null) {
                        callbackError();
                        return;
                    }

                    // Make sure we know the last location of the user
                    if(!liveUser.hasLocation()) {
                        // Send a message response to the user
                        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                            error: true,
                            message: 'Failed to build factory, we don\'t know your position. Please make sure your GPS is enabled.',
                            dialog: true
                        }, socket);
                        return;
                    }

                    // Get the users location
                    const factoryLocation = liveUser.getLocation();

                    // Calculate the factory cost
                    liveGame.calculateFactoryCost(liveUser.getTeamModel(), function(err, factoryCost) {
                        // Call back errors
                        if(err !== null || liveUser == null) {
                            callbackError();
                            return;
                        }

                        // Make sure the user has enough money
                        liveUser.getMoney(function(err, money) {
                            // Call back errors
                            if(err !== null || liveUser == null) {
                                callbackError();
                                return;
                            }

                            // Make sure the user has enough money
                            if(money < factoryCost) {
                                // Send a message response to the user
                                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                    error: true,
                                    message: 'You don\'t have enough money to build a factory.',
                                    dialog: true
                                }, socket);
                                return;
                            }

                            // Subtract the money
                            liveUser.subtractMoney(factoryCost, function(err, callback) {
                                // Call back errors
                                if(err !== null || liveUser == null) {
                                    callbackError();
                                    return;
                                }

                                // Add the factory
                                FactoryDatabase.addFactory(factoryName, game, user, factoryLocation, function(err, factoryModel) {
                                    // Call back errors
                                    if(err !== null || liveUser == null) {
                                        callbackError();
                                        return;
                                    }

                                    // Load the factory in the live game
                                    liveGame.factoryManager.getFactory(factoryModel, function(err, liveFactory) {
                                        // Call back errors
                                        if(err !== null || liveUser == null) {
                                            callbackError();
                                            return;
                                        }

                                        // Send a response to the user
                                        Core.realTime.packetProcessor.sendPacket(PacketType.FACTORY_BUILD_RESPONSE, {
                                            game: rawGame,
                                            factory: factoryModel.getIdHex()
                                        }, socket);

                                        // Send new game data to everyone
                                        Core.gameController.sendGameDataToAll(game, function(err) {
                                            // Handle errors
                                            if(err !== null) {
                                                console.error('Failed to send game data updates, ignoring');
                                                console.error(err);
                                            }
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

// Export the module
module.exports = GameChangeStageHandler;
