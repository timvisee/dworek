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
const HANDLER_PACKET_TYPE = PacketType.GAME_INFO_REQUEST;

/**
 * Game info request handler.
 *
 * @param {boolean=false} init True to initialize after constructing.
 *
 * @class
 * @constructor
 */
var GameInfoRequestHandler = function(init) {
    // Initialize
    if(init)
        this.init();
};

/**
 * Initialize the handler.
 */
GameInfoRequestHandler.prototype.init = function() {
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
GameInfoRequestHandler.prototype.handler = function(packet, socket) {
    // Make sure a session is given
    if(!packet.hasOwnProperty('game')) {
        console.log('Received malformed packet, game stage change packet doesn\'t contain game/stage data');
        return;
    }

    // Get the game and stage
    const rawGame = packet.game;

    // Make sure the user is authenticated
    if(!_.has(socket, 'session.valid') || !socket.session.valid) {
        // Send a message response to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to request game info, you\'re not authenticated.',
            dialog: true
        }, socket);
        return;
    }

    // Get the user
    const user = socket.session.user;

    // Create an error callback
    const callbackError = function() {
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to request game info, an internal error occurred.',
            dialog: true
        }, socket);
    };

    // Get the game instance by it's ID
    Core.model.gameModelManager.getGameById(rawGame, function(err, game) {
        // Handle errors
        if(err !== null || game == null) {
            // Print the error to the console
            console.error(err);

            // Send a message response to the user
            callbackError();
            return;
        }

        // Create a callback latch
        var latch = new CallbackLatch();

        // Keep track whether we called back
        var calledBack = false;

        // Create a game info object
        var gameInfoObject = {};

        // Get the game stage
        latch.add();
        game.getStage(function(err, stage) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callbackError();
                calledBack = true;
                console.error(err);
                return;
            }

            // Set the game stage
            gameInfoObject.stage = stage;

            // Resolve the latch
            latch.resolve();
        });

        // Get the game user roles
        latch.add();
        game.getUserState(user, function(err, state) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callbackError();
                calledBack = true;
                console.error(err);
                return;
            }

            // Set the user roles
            gameInfoObject.roles = state;

            // Resolve the latch
            latch.resolve();
        });

        // Send the result when we're done
        latch.then(function() {
            // Send the response
            Core.realTime.packetProcessor.sendPacket(PacketType.GAME_INFO, gameInfoObject, socket);
        });
    });
};

// Export the module
module.exports = GameInfoRequestHandler;
