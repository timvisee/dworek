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
var Formatter = require('../../format/Formatter');

/**
 * Type of packets to handle by this handler.
 * @type {number} Packet type.
 */
const HANDLER_PACKET_TYPE = PacketType.FACTORY_DEPOSIT;

/**
 * Factory deposit handler.
 *
 * @param {boolean=false} init True to initialize after constructing.
 *
 * @class
 * @constructor
 */
var FactoryDepositHandler = function(init) {
    // Initialize
    if(init)
        this.init();
};

/**
 * Initialize the handler.
 */
FactoryDepositHandler.prototype.init = function() {
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
FactoryDepositHandler.prototype.handler = function(packet, socket) {
    // Make sure we only call back once
    var calledBack = false;

    // Create a function to call back an error
    const callbackError = function() {
        // Only call back once
        if(calledBack)
            return;

        // Set the called back flag
        calledBack = true;

        // Send a message to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to deposit, a server error occurred.',
            dialog: true
        }, socket);
    };

    // Make sure a session is given
    if(!packet.hasOwnProperty('factory') || (!packet.hasOwnProperty('amount') && !packet.hasOwnProperty('all'))) {
        console.log('Received malformed packet');
        callbackError();
        return;
    }

    // Get the raw parameters
    const rawFactory = packet.factory;
    const rawGoodType = packet.goodType;
    const rawAmount = packet.amount;
    const rawAll = packet.all;

    // Determine whether to deposit the in or out good type
    const typeIn = rawGoodType === 'in';

    // Make sure the user is authenticated
    if(!_.has(socket, 'session.valid') || !socket.session.valid) {
        // Send a message response to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to deposit, you\'re not authenticated.',
            dialog: true
        }, socket);
        return;
    }

    // Get the user
    const user = socket.session.user;

    // Get the factory
    Core.model.factoryModelManager.isValidFactoryId(rawFactory, function(err, isValidFactory) {
        // Callback errors
        if(!isValidFactory || err !== null) {
            callbackError();
            return;
        }

        // Create a factory model instance
        const factoryModel = Core.model.factoryModelManager._instanceManager.create(rawFactory);

        // Get the game
        factoryModel.getGame(function(err, game) {
            // Callback errors
            if(err !== null) {
                callbackError();
                return;
            }

            // Get the game user
            Core.model.gameUserModelManager.getGameUser(game, user, function(err, gameUser) {
                // Callback errors
                if(err !== null) {
                    callbackError();
                    return;
                }

                // Get the live game instance
                Core.gameController.getGame(game, function(err, liveGame) {
                    // Callback errors
                    if(err !== null || liveGame === null) {
                        callbackError();
                        return;
                    }

                    // Get the live factory instance
                    liveGame.factoryManager.getFactory(rawFactory, function(err, liveFactory) {
                        // Callback errors
                        if(err !== null || liveFactory === null) {
                            callbackError();
                            return;
                        }

                        // Make sure the user has right to modify this factory
                        liveFactory.canModify(user, function(err, canModify) {
                            // Callback errors
                            if(err !== null) {
                                callbackError();
                                return;
                            }

                            // Make sure the user has rights to modify the factory
                            if(!canModify) {
                                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                    error: true,
                                    message: 'Failed to deposit, you aren\'t close enough or you don\'t have permission.',
                                    dialog: true
                                }, socket);
                                return;
                            }

                            // Get the amount of goods the factory and user has
                            var factoryGoodsCurrent;
                            var userGoodsCurrent;

                            // Create a callback latch to fetch the current amount of goods
                            var latch = new CallbackLatch();

                            // Get the amount of the type of goods we're withdrawing
                            if(typeIn) {
                                // Get the amount of goods the factory has
                                latch.add();
                                factoryModel.getIn(function (err, inAmount) {
                                    // Call back errors
                                    if (err !== null) {
                                        callbackError();
                                        return;
                                    }

                                    // Set the amount of goods
                                    factoryGoodsCurrent = inAmount;

                                    // Resolve the latch
                                    latch.resolve();
                                });

                                // Get the amount of goods the user has
                                latch.add();
                                gameUser.getIn(function (err, inAmount) {
                                    // Call back errors
                                    if (err !== null) {
                                        callbackError();
                                        return;
                                    }

                                    // Set the amount of goods
                                    userGoodsCurrent = inAmount;

                                    // Resolve the latch
                                    latch.resolve();
                                });
                            } else {
                                // Get the amount of goods the factory has
                                latch.add();
                                factoryModel.getOut(function (err, outAmount) {
                                    // Call back errors
                                    if (err !== null) {
                                        callbackError();
                                        return;
                                    }

                                    // Set the amount of goods
                                    factoryGoodsCurrent = outAmount;

                                    // Resolve the latch
                                    latch.resolve();
                                });

                                // Get the amount of goods the user has
                                latch.add();
                                gameUser.getOut(function (err, outAmount) {
                                    // Call back errors
                                    if (err !== null) {
                                        callbackError();
                                        return;
                                    }

                                    // Set the amount of goods
                                    userGoodsCurrent = outAmount;

                                    // Resolve the latch
                                    latch.resolve();
                                });
                            }

                            // Continue when the good amounts are fetched
                            latch.then(function() {
                                // Determine the amount to deposit
                                var depositAmount = 0;

                                // Check whether we should use the maximum amount
                                if(rawAll === true)
                                    depositAmount = userGoodsCurrent;
                                else {
                                    // Parse the raw amount
                                    depositAmount = parseInt(rawAmount);
                                }

                                // Make sure the amount isn't above the maximum
                                if(depositAmount > userGoodsCurrent) {
                                    Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                        error: true,
                                        message: 'Failed to deposit, you don\'t have this much goods available.',
                                        dialog: true
                                    }, socket);
                                    return;
                                }

                                // Make sure the amount isn't below zero
                                if(depositAmount < 0) {
                                    callbackError();
                                    return;
                                }

                                // Make the sure the amount isn't zero
                                if(depositAmount === 0) {
                                    Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                        error: true,
                                        message: '<i>You can\'t deposit no nothin\'.</i>',
                                        dialog: true
                                    }, socket);
                                    return;
                                }

                                // Reset the latch to it's identity
                                latch.identity();

                                // Deposit the correct type of goods from the factory, and withdraw them to the user
                                if(typeIn) {
                                    // Deposit the in to the factory
                                    latch.add();
                                    factoryModel.addIn(depositAmount, function(err) {
                                        // Callback errors
                                        if(err !== null) {
                                            callbackError();
                                            return;
                                        }

                                        // Resolve the latch
                                        latch.resolve();
                                    });

                                    // Withdraw the in from the user
                                    latch.add();
                                    gameUser.subtractIn(depositAmount, function(err) {
                                        // Callback errors
                                        if(err !== null) {
                                            callbackError();
                                            return;
                                        }

                                        // Resolve the latch
                                        latch.resolve();
                                    });
                                } else {
                                    // Deposit the out to the factory
                                    latch.add();
                                    factoryModel.addOut(depositAmount, function(err) {
                                        // Callback errors
                                        if(err !== null) {
                                            callbackError();
                                            return;
                                        }

                                        // Resolve the latch
                                        latch.resolve();
                                    });

                                    // Withdraw the out from the user
                                    latch.add();
                                    gameUser.subtractOut(depositAmount, function(err) {
                                        // Callback errors
                                        if(err !== null) {
                                            callbackError();
                                            return;
                                        }

                                        // Resolve the latch
                                        latch.resolve();
                                    });
                                }

                                // Continue when we finished the transaction
                                latch.then(function() {
                                    // Send updated game data to the user
                                    Core.gameController.sendGameData(game, user, undefined, function(err) {
                                        // Handle errors
                                        if(err !== null) {
                                            console.error(err);
                                            console.error('Failed to broadcast factory data');
                                        }
                                    });

                                    // Broadcast the factory data, since it's updated
                                    liveFactory.broadcastData(function(err) {
                                        // Handle errors
                                        if(err !== null) {
                                            console.error(err);
                                            console.error('Failed to broadcast factory data');
                                        }
                                    });

                                    // Get the live user instance
                                    liveGame.getUser(user, function(err, liveUser) {
                                        // Handle errors
                                        if(liveUser === null || err !== null) {
                                            console.error(err);
                                            console.error('Failed to send transaction success');
                                            return;
                                        }

                                        // Get the user's balance table
                                        liveUser.getBalanceTable({
                                            ['previous' + (typeIn ? 'In' : 'Out')]: userGoodsCurrent
                                        }, function (err, balanceTable) {
                                            // Handle errors
                                            if (balanceTable === null || balanceTable === undefined || err !== null) {
                                                console.error(err);
                                                console.error('Failed to send transaction success');
                                                return;
                                            }

                                            // Send a notification to the user
                                            // TODO: Get the in name from the game's name configuration
                                            Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                                error: false,
                                                message: 'Deposited ' + Formatter.formatGoods(depositAmount) + ' ' + (typeIn ? 'ingredient' : 'drug') + (depositAmount === 1 ? '' : 's') + '.<br><br>' + balanceTable,
                                                dialog: false,
                                                toast: true,
                                                ttl: 10 * 1000
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
};

// Export the module
module.exports = FactoryDepositHandler;
