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
const HANDLER_PACKET_TYPE = PacketType.FACTORY_ATTACK;

/**
 * Factory attack handler.
 *
 * @param {boolean=false} init True to initialize after constructing.
 *
 * @class
 * @constructor
 */
var FactoryAttackHandler = function(init) {
    // Initialize
    if(init)
        this.init();
};

/**
 * Initialize the handler.
 */
FactoryAttackHandler.prototype.init = function() {
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
FactoryAttackHandler.prototype.handler = function(packet, socket) {
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
            message: 'Failed to attack factory, an internal error occurred',
            dialog: true
        }, socket);

        // Set the called back flag
        calledBack = true;
    };

    // Make sure a session is given
    if(!packet.hasOwnProperty('game') || !packet.hasOwnProperty('factory')) {
        callbackError();
        return;
    }

    // Get the factory and game
    const rawGame = packet.game;
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

    // Get the live game instance
    Core.gameManager.getGame(rawGame, function(err, liveGame) {
        // Call back errors
        if(err !== null || liveGame === null) {
            callbackError();
            return;
        }

        // Create a latch
        var latch = new CallbackLatch();

        // Create a variable for the live factory and user
        var liveFactory = null;
        var liveUser = null;

        // Get the factory
        latch.add();
        liveGame.factoryManager.getFactory(rawFactory, function(err, result) {
            // Call back errors
            if(err !== null || result === null) {
                callbackError();
                return;
            }

            // Set the factory
            liveFactory = result;

            // Resolve the latch
            latch.resolve();
        });

        // Get the user
        latch.add();
        liveGame.getUser(user, function(err, result) {
            // Call back errors
            if(err !== null || result === null) {
                callbackError();
                return;
            }

            // Set the user
            liveUser = result;

            // Resolve the latch
            latch.resolve();
        });

        // Continue when the latch is resolve
        latch.then(function() {
            // Reset the latch
            latch.identity();

            // Get the user's team
            latch.add();
            liveUser.getTeam(function(err, userTeam) {
                // Call back errors
                if(err !== null || userTeam === null) {
                    callbackError();
                    return;
                }

                // Make sure the factory has a different team
                liveFactory.isTeam(userTeam, function(err, isTeam) {
                    // Call back errors
                    if(err !== null || userTeam === null) {
                        callbackError();
                        return;
                    }

                    // Make sure the user is in a different team
                    if(isTeam) {
                        // Only call back once
                        if(calledBack)
                            return;

                        // Send a message to the user
                        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                            error: true,
                            message: 'You can\'t attack your own factory',
                            dialog: true
                        }, socket);

                        // Set the called back flag
                        calledBack = true;
                        return;
                    }

                    // Resolve the latch
                    latch.resolve();
                });
            });

            // Make sure the conquer value of the factory is valid
            latch.add();
            liveFactory.getConquer(function(err, conquerValue) {
                // Call back errors
                if(err !== null) {
                    callbackError();
                    return;
                }

                // Make sure the conquer value is above zero
                if(conquerValue <= 0) {
                    // Only call back once
                    if(calledBack)
                        return;

                    // Send a message to the user
                    Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                        error: true,
                        message: 'Failed to attack. The conquer value must be above zero. (currently ' + conquerValue + ')',
                        dialog: true
                    }, socket);

                    // Set the called back flag
                    calledBack = true;
                    return;
                }

                // Resolve the latch
                latch.resolve();
            });

            // Continue
            latch.then(function() {
                // Attack the factory
                liveFactory.attack(liveUser, function(err) {
                    // Call back errors
                    if(err !== null)
                        callbackError();
                });
            });
        });
    });
};

// Export the module
module.exports = FactoryAttackHandler;
