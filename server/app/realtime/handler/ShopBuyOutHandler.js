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
const HANDLER_PACKET_TYPE = PacketType.SHOP_BUY_OUT;

/**
 * Location update handler.
 *
 * @param {boolean=false} init True to initialize after constructing.
 *
 * @class
 * @constructor
 */
var ShopBuyOutHandler = function(init) {
    // Initialize
    if(init)
        this.init();
};

/**
 * Initialize the handler.
 */
ShopBuyOutHandler.prototype.init = function() {
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
ShopBuyOutHandler.prototype.handler = function(packet, socket) {
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
            message: 'Failed to sell goods, a server error occurred.',
            dialog: true
        }, socket);

        // Set the called back flag
        calledBack = true;
    };

    // Make sure a session is given
    if(!packet.hasOwnProperty('shop') || (!packet.hasOwnProperty('amount') && !packet.hasOwnProperty('all'))) {
        console.log('Received malformed packet');
        callbackError();
        return;
    }

    // Get the raw parameters
    const rawShop = packet.shop;
    const rawAmount = packet.amount;
    const rawAll = packet.all;

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

    // Create a found flag
    var foundShop = false;

    // Call back an error if the shop wasn't found
    if(!foundShop) {
        // Send a message response to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to sell goods, couldn\'t find shop. The shop you\'re trying to sell goods to might not be available anymore.',
            dialog: true
        }, socket);
        return;
    }

    // Loop through the games and shops to find the correct shop
    Core.gameController.games.forEach(function(liveGame) {
        // Loop through the shops
        liveGame.shopManager.shops.forEach(function(liveShop) {
            // Check whether this is the correct shop
            if(!liveShop.getToken() == rawShop)
                return;

            // Set the found flag
            foundShop = true;

            // Get the game user
            Core.model.gameUserModelManager.getGameUser(liveGame.getGameModel(), user, function(err, gameUser) {
                // Call back errors
                if(err !== null) {
                    callbackError();
                    return;
                }

                // Get the live user
                liveGame.getUser(user, function(err, liveUser) {
                    // Call back errors
                    if(err !== null || liveUser == null) {
                        callbackError();
                        return;
                    }

                    // Make sure the user is in range
                    liveShop.isUserInRange(liveUser, function(err, inRange) {
                        // Call back errors
                        if(err !== null || !inRange) {
                            callbackError();
                            return;
                        }

                        // Get the price
                        const price = liveShop.getOutBuyPrice();

                        // The the amount of goods the user has
                        gameUser.getOut(function(err, outAmount) {
                            // Call back errors
                            if(err !== null) {
                                callbackError();
                                return;
                            }

                            // Determine the amount to deposit
                            var sellAmount = 0;

                            // Check whether we should use the maximum amount
                            if(rawAll === true)
                                sellAmount = outAmount;
                            else
                            // Parse the raw amount
                                sellAmount = parseInt(rawAmount);

                            // Make sure the amount isn't above the maximum
                            if(sellAmount > outAmount) {
                                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                    error: true,
                                    message: 'Failed to sell, you don\'t have this much goods available.',
                                    dialog: true
                                }, socket);
                                return;
                            }

                            // Make sure the amount isn't below zero
                            if(sellAmount < 0) {
                                callbackError();
                                return;
                            }

                            // Make the sure the amount isn't zero
                            if(sellAmount === 0) {
                                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                    error: true,
                                    message: '<i>You can\'t sell no nothin\'.</i>',
                                    dialog: true
                                }, socket);
                                return;
                            }

                            // Set the out amount for the user
                            gameUser.setOut(outAmount - sellAmount, function(err) {
                                // Call back errors
                                if(err !== null) {
                                    callbackError();
                                    return;
                                }

                                // Get the current user balance
                                gameUser.getMoney(function(err, userMoney) {
                                    // Call back errors
                                    if(err !== null) {
                                        callbackError();
                                        return;
                                    }

                                    // Set the money
                                    gameUser.setMoney(userMoney + Math.round(sellAmount * price), function(err) {
                                        // Call back errors
                                        if(err !== null) {
                                            callbackError();
                                            return;
                                        }

                                        // Send updated game data to the user
                                        Core.gameController.sendGameData(liveGame.getGameModel(), user, undefined, function(err) {
                                            // Return of no error occurred
                                            if(err === null)
                                                return;

                                            // Print errors in the console
                                            console.error(err);
                                            console.error('Failed to send game data');
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
};

// Export the module
module.exports = ShopBuyOutHandler;
