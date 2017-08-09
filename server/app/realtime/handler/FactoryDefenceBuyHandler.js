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
const HANDLER_PACKET_TYPE = PacketType.FACTORY_DEFENCE_BUY;

/**
 * Location update handler.
 *
 * @param {boolean=false} init True to initialize after constructing.
 *
 * @class
 * @constructor
 */
var FactoryDefenceBuyHandler = function(init) {
    // Initialize
    if(init)
        this.init();
};

/**
 * Initialize the handler.
 */
FactoryDefenceBuyHandler.prototype.init = function() {
    // Make sure the real time instance is initialized
    if(Core.realTime === null)
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
FactoryDefenceBuyHandler.prototype.handler = function(packet, socket) {
    // Make sure we only call back once
    var calledBack = false;

    // Create a function to call back an error
    const callbackError = function(err) {
        // Print the error
        if(err !== null && err !== undefined) {
            console.error('An error occurred while buying defence upgrades for a user');
            console.error(err.stack || err);
        }

        // Only call back once
        if(calledBack)
            return;

        // Send a message to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to buy defence upgrade, a server error occurred.',
            dialog: true
        }, socket);

        // Set the called back flag
        calledBack = true;
    };

    // Make sure a session is given
    if(!packet.hasOwnProperty('factory') || !packet.hasOwnProperty('index') || !packet.hasOwnProperty('cost') || !packet.hasOwnProperty('defence')) {
        console.log('Received malformed packet');
        callbackError(new Error('Malformed packet'));
        return;
    }

    // Get the raw parameters
    const rawFactory = packet.factory;
    const index = packet.index;
    const cost = packet.cost;
    const defence = packet.defence;

    // Make sure the user is authenticated
    if(!_.has(socket, 'session.valid') || !socket.session.valid) {
        // Send a message response to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to buy defence upgrade, you\'re not authenticated.',
            dialog: true
        }, socket);
        return;
    }

    // Get the user
    const user = socket.session.user;

    // Get the factory
    Core.model.factoryModelManager.isValidFactoryId(rawFactory, function(err, isValidFactory) {
        if(!isValidFactory || err !== null) {
            callbackError(err);
            return;
        }

        // Create a factory model instance
        const factoryModel = Core.model.factoryModelManager._instanceManager.create(rawFactory);

        // Get the game
        factoryModel.getGame(function(err, game) {
            if(err !== null) {
                callbackError(err);
                return;
            }

            // Get the game user
            Core.model.gameUserModelManager.getGameUser(game, user, function(err, gameUser) {
                if(err !== null) {
                    callbackError(err);
                    return;
                }

                Core.gameManager.getGame(game, function(err, liveGame) {
                    if(err !== null || liveGame === null) {
                        callbackError(err);
                        return;
                    }

                    liveGame.factoryManager.getFactory(rawFactory, function(err, liveFactory) {
                        if(err !== null || liveFactory === null) {
                            callbackError(err);
                            return;
                        }

                        // Make sure the user has right to modify this factory
                        liveFactory.canModify(user, function(err, canModify) {
                            if(err !== null) {
                                callbackError(err);
                                return;
                            }

                            if(!canModify) {
                                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                    error: true,
                                    message: 'Failed to buy defence, you aren\'t close enough or you don\'t have permission.',
                                    dialog: true
                                }, socket);
                                return;
                            }

                            // Get the factory defences
                            liveFactory.getDefenceUpgrades(function(err, defences) {
                                if(err !== null) {
                                    callbackError(err);
                                    return;
                                }

                                // Make sure the index is in-bound
                                if(index < 0 || index >= defences.length) {
                                    Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                        error: true,
                                        message: 'Failed to buy defence, prices have changed.',
                                        dialog: true
                                    }, socket);
                                    return;
                                }

                                // Get the defence
                                var selectedDefence = defences[index];

                                // Compare the price and defence
                                if(selectedDefence.cost !== cost || selectedDefence.defence !== defence) {
                                    Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                        error: true,
                                        message: 'Failed to buy defence, prices have changed.',
                                        dialog: true
                                    }, socket);
                                    return;
                                }

                                // Make sure the user has enough money
                                gameUser.getMoney(function(err, money) {
                                    if(err !== null) {
                                        callbackError(err);
                                        return;
                                    }

                                    if(money < selectedDefence.cost) {
                                        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                            error: true,
                                            message: 'Failed to buy defence, you don\'t have enough money.',
                                            dialog: true
                                        }, socket);
                                        return;
                                    }

                                    // Subtract the money
                                    gameUser.subtractMoney(selectedDefence.cost, function(err) {
                                        if(err !== null) {
                                            callbackError(err);
                                            return;
                                        }

                                        // Get the current defence
                                        factoryModel.getDefence(function(err, defence) {
                                            if(err !== null) {
                                                callbackError(err);
                                                return;
                                            }

                                            // Set the new defence
                                            factoryModel.setDefence(defence + selectedDefence.defence, function(err) {
                                                if(err !== null) {
                                                    callbackError(err);
                                                    return;
                                                }

                                                liveFactory.broadcastData(function(err) {
                                                    if(err !== null) {
                                                        console.error(err.stack || err);
                                                        console.error('Failed to broadcast factory data, ignoring');
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
                                        }, {
                                            noCache: true
                                        });
                                    });
                                }, {
                                    noCache: true
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
module.exports = FactoryDefenceBuyHandler;
