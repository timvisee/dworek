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
const HANDLER_PACKET_TYPE = PacketType.FACTORY_LEVEL_BUY;

/**
 * Location update handler.
 *
 * @param {boolean=false} init True to initialize after constructing.
 *
 * @class
 * @constructor
 */
var FactoryLevelBuyHandler = function(init) {
    // Initialize
    if(init)
        this.init();
};

/**
 * Initialize the handler.
 */
FactoryLevelBuyHandler.prototype.init = function() {
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
FactoryLevelBuyHandler.prototype.handler = function(packet, socket) {
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
            message: 'Failed to upgrade level, a server error occurred.',
            dialog: true
        }, socket);

        // Set the called back flag
        calledBack = true;
    };

    // Make sure a session is given
    if(!packet.hasOwnProperty('factory') || !packet.hasOwnProperty('cost')) {
        console.log('Received malformed packet');
        callbackError();
        return;
    }

    // Get the raw parameters
    const rawFactory = packet.factory;
    const cost = packet.cost;

    // Make sure the user is authenticated
    if(!_.has(socket, 'session.valid') || !socket.session.valid) {
        // Send a message response to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to buy upgrade, you\'re not authenticated.',
            dialog: true
        }, socket);
        return;
    }

    // Get the user
    const user = socket.session.user;

    // Get the factory
    Core.model.factoryModelManager.isValidFactoryId(rawFactory, function(err, isValidFactory) {
        // Call back errors
        if(err !== null) {
            callbackError();
            return;
        }

        // Create a factory model instance
        const factoryModel = Core.model.factoryModelManager._instanceManager.create(rawFactory);

        // Get the game
        factoryModel.getGame(function(err, game) {
            // Call back errors
            if(err !== null) {
                callbackError();
                return;
            }

            // Get the game user
            Core.model.gameUserModelManager.getGameUser(game, user, function(err, gameUser) {
                // Call back errors
                if(err !== null) {
                    callbackError();
                    return;
                }

                // Get the live game instance for the current game
                Core.gameController.getGame(game, function(err, liveGame) {
                    // Call back errors
                    if(err !== null || liveGame == null) {
                        callbackError();
                        return;
                    }

                    // Get the live factory for the factory
                    liveGame.factoryManager.getFactory(rawFactory, function(err, liveFactory) {
                        // Call back errors
                        if(err !== null || liveFactory == null) {
                            callbackError();
                            return;
                        }

                        // Make sure the user has right to modify this factory
                        liveFactory.canModify(user, function(err, canModify) {
                            // Call back errors
                            if(err !== null) {
                                callbackError();
                                return;
                            }

                            // Send an error to the user if the factory can't be modified
                            if(!canModify) {
                                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                    error: true,
                                    message: 'Failed to buy upgrade, you aren\'t close enough or you don\'t have permission.',
                                    dialog: true
                                }, socket);
                                return;
                            }

                            // Get the cost for a level upgrade
                            liveFactory.getNextLevelCost(function(err, nextLevelCost) {
                                // Call back errors
                                if(err !== null) {
                                    callbackError();
                                    return;
                                }

                                // Compare the price and defence
                                if(nextLevelCost != cost) {
                                    Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                        error: true,
                                        message: 'Failed to buy upgrade, prices have changed.',
                                        dialog: true
                                    }, socket);
                                    return;
                                }

                                // Make sure the user has enough money
                                gameUser.getMoney(function(err, money) {
                                    // Call back errors
                                    if(err !== null) {
                                        callbackError();
                                        return;
                                    }

                                    // Make sure the user has enough money
                                    if(money < nextLevelCost) {
                                        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                            error: true,
                                            message: 'Failed to buy upgrade, you don\'t have enough money.',
                                            dialog: true
                                        }, socket);
                                        return;
                                    }

                                    // Subtract the money
                                    gameUser.subtractMoney(nextLevelCost, function(err) {
                                        // Call back errors
                                        if(err !== null) {
                                            callbackError();
                                            return;
                                        }

                                        // Get the current factory level
                                        factoryModel.getLevel(function(err, level) {
                                            // Call back errors
                                            if(err !== null) {
                                                callbackError();
                                                return;
                                            }

                                            // Set the new factory level, increase it by one
                                            factoryModel.setLevel(level + 1, function(err) {
                                                // Call back errors
                                                if(err !== null) {
                                                    callbackError();
                                                    return;
                                                }

                                                // Broadcast the factory data to the user
                                                liveFactory.broadcastData(function(err) {
                                                    // Call back errors
                                                    if(err !== null) {
                                                        console.error(err);
                                                        console.error('Failed to broadcast factory data');
                                                    }
                                                });

                                                // Send a notification to the user
                                                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                                    error: false,
                                                    message: 'Transaction succeed!',
                                                    dialog: false,
                                                    toast: true
                                                }, socket);
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
    });
};

// Export the module
module.exports = FactoryLevelBuyHandler;
