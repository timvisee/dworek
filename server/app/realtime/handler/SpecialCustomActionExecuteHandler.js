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
const HANDLER_PACKET_TYPE = PacketType.SPECIAL_CUSTOM_ACTION_EXECUTE;

/**
 * Location update handler.
 *
 * @param {boolean=false} init True to initialize after constructing.
 *
 * @class
 * @constructor
 */
var SpecialCustomActionExecute = function(init) {
    // Initialize
    if(init)
        this.init();
};

/**
 * Initialize the handler.
 */
SpecialCustomActionExecute.prototype.init = function() {
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
SpecialCustomActionExecute.prototype.handler = function(packet, socket) {
    // Make sure we only call back once
    var calledBack = false;

    // Create a function to call back an error
    const callbackError = function(err) {
        // Only call back once
        if(calledBack)
            return;

        // Send a message to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to execute the custom action, an error occurred.',
            dialog: true
        }, socket);

        // Set the called back flag
        calledBack = true;

        // Print the error to the console if anything is given
        if(err !== undefined) {
            console.error('Failed to execute a special custom action on client request:');
            console.error(err);
            throw err;
        }
    };

    // Make sure a session is given
    if(!packet.hasOwnProperty('game') || !packet.hasOwnProperty('properties')) {
        console.log('Received malformed packet, factory build packet does not contain required data');
        callbackError();
        return;
    }

    // Get the game and properties
    const rawGame = packet.game;
    const rawProperties = packet.properties;

    // Make sure the properties are an object
    if(!_.isObject(rawProperties)) {
        callbackError(new Error('Malformed properties, not an object'));
        return;
    }

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

    // Create a variable for the game and the live user
    var game = null;
    var liveGame = null;
    var liveUser = null;
    var gameUser = null;

    // Define whether the user has permission
    var hasPermission = false;

    // Create a callback latch
    var latch = new CallbackLatch();

    // Get the game instance by it's ID
    latch.add();
    Core.model.gameModelManager.getGameById(rawGame, function(err, result) {
        // Handle errors
        if(err !== null || result === null) {
            if(game === null)
                err = new Error('Game instance is null');
            callbackError(err);
            return;
        }

        // Set the game instance
        game = result;

        // Check whether the user has game management permissions
        latch.add();
        game.hasManagePermission(user, function(err, result) {
            // Handle errors
            if(err !== null) {
                callbackError(err);
                return;
            }

            // Set the permission flag if the user has management permissions
            if(result)
                hasPermission = true;

            // Resolve the latch
            latch.resolve();
        });

        // Get the game user
        latch.add();
        Core.model.gameUserModelManager.getGameUser(game, user, function(err, result) {
            // Handle errors
            if(err !== null) {
                callbackError(err);
                return;
            }

            // Set the game user instance
            gameUser = result;

            // Check whether the user is a special player
            result.isSpecial(function(err, isSpecial) {
                // Handle errors
                if(err !== null) {
                    callbackError(err);
                    return;
                }

                // If the user is special it has permission
                if(isSpecial)
                    hasPermission = true;

                // Resolve the latch
                latch.resolve();
            });
        });

        // Get the live game
        latch.add();
        Core.gameManager.getGame(game, function(err, result) {
            // Handle errors
            if(err !== null) {
                callbackError(err);
                return;
            }

            // Set the live game instance
            liveGame = result;

            // Get the live user
            liveGame.getUser(user, function(err, result) {
                // Handle errors
                if(err !== null) {
                    callbackError(err);
                    return;
                }

                // Set the live user instance
                liveUser = result;

                // Make sure the location of the user is known
                if(!liveUser.hasLocation()) {
                    // Send a message response to the user
                    Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                        error: true,
                        message: 'Unable to execute the special custom action. The server doesn\'t know your current location.<br><br>' +
                        'Please ensure that your location services are enabled and functioning.<br><br>' +
                        'Please try this again after ' + liveGame.__('app.name', { game: game.getIdHex() }) + ' has found your current location.',
                        dialog: true
                    }, socket);
                    return;
                }

                // Resolve the latch
                latch.resolve();
            });
        });

        // Resolve the latch
        latch.resolve();
    });

    // Continue when we've got all required parameters
    latch.then(function() {
        // Cancel if the user doesn't have permission
        if(!hasPermission) {
            // Send a message response to the user
            Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                error: true,
                message: 'You don\'t have permission to execute a special custom action.',
                dialog: true
            }, socket);
            return;
        }

        // Execute the special custom action
        liveGame.executeSpecialCustomAction(user, rawProperties, function(err) {
            // Handle errors
            if(err !== null)
                callbackError(err);
        });
    });
};

// Export the module
module.exports = SpecialCustomActionExecute;
