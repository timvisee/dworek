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
const HANDLER_PACKET_TYPE = PacketType.SHOP_SELL_IN;

/**
 * Location update handler.
 *
 * @param {boolean=false} init True to initialize after constructing.
 *
 * @class
 * @constructor
 */
var ShopSellInHandler = function(init) {
    // Initialize
    if(init)
        this.init();
};

/**
 * Initialize the handler.
 */
ShopSellInHandler.prototype.init = function() {
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
ShopSellInHandler.prototype.handler = function(packet, socket) {
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
            message: 'Transaction failed, a server error occurred.',
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
    const rawMoneyAmount = packet.moneyAmount;
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

                    // Make sure the player is in range
                    liveShop.isUserInRange(liveUser, function(err, inRange) {
                        // Call back errors
                        if(err !== null || !inRange) {
                            callbackError();
                            return;
                        }

                        // Get the price
                        const price = liveShop.getInSellPrice();

                        // The the amount of money the user has
                        gameUser.getMoney(function(err, moneyCurrent) {
                            // Call back errors
                            if(err !== null) {
                                callbackError();
                                return;
                            }

                            // Determine the amount to buy
                            var moneyAmount = 0;

                            // Check whether we should use the maximum amount
                            if(rawAll === true)
                                moneyAmount = Math.round(Math.floor(moneyCurrent / price) * price);
                            else
                                // Parse the raw amount
                                moneyAmount = parseInt(rawMoneyAmount);

                            // Calculate the amount of ingredients to buy and revalidate the amount of money the user spends
                            const inAmount = Math.round(moneyAmount / price);
                            moneyAmount = Math.round(inAmount * price);

                            // Make sure the amount isn't above the maximum
                            if(moneyAmount > moneyCurrent) {
                                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                    error: true,
                                    message: 'Failed to buy, you don\'t have this much money.',
                                    dialog: true
                                }, socket);
                                return;
                            }

                            // The amount of money may not be below zero
                            if(moneyAmount < 0) {
                                callbackError();
                                return;
                            }

                            // The user must buy something
                            if(moneyAmount == 0 || inAmount == 0) {
                                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                    error: true,
                                    message: '<i>You can\'t buy no nothin\'.</i>',
                                    dialog: true
                                }, socket);
                                return;
                            }

                            // Subtract the money that is spend from the user
                            gameUser.subtractMoney(moneyAmount, function(err) {
                                // Call back errors
                                if(err !== null) {
                                    callbackError();
                                    return;
                                }

                                // Add the bought in amount to the user
                                gameUser.addIn(inAmount, function(err) {
                                    // Call back errors
                                    if(err !== null) {
                                        callbackError();
                                        return;
                                    }

                                    // Send updated game data to the user
                                    Core.gameController.sendGameData(liveGame.getGameModel(), user, undefined, function(err) {
                                        // Handle errors
                                        if(err !== null) {
                                            console.error(err);
                                            console.error('Failed to send game data');
                                        }
                                    });

                                    // Send a notification to the user
                                    // TODO: Get the in and money name from the name configuration of the current game
                                    Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                        error: false,
                                        message: 'Bought ' + inAmount + ' ingredients for $' + moneyAmount,
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

    // Call back an error if the shop wasn't found
    if(!foundShop) {
        // Send a message response to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'The transaction failed, couldn\'t find shop. The shop you\'re trying to use might not be available anymore.',
            dialog: true
        }, socket);
    }
};

// Export the module
module.exports = ShopSellInHandler;
