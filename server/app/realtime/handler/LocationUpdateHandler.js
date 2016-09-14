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

/**
 * Type of packets to handle by this handler.
 * @type {number} Packet type.
 */
const HANDLER_PACKET_TYPE = PacketType.LOCATION_UPDATE;

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
    // Create a function to call back an error
    const callbackError = function() {
        // Send a message to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to send your location, an server error occurred.',
            dialog: true
        }, socket);
    };

    // Make sure a session is given
    if(!packet.hasOwnProperty('game') || !packet.hasOwnProperty('location')) {
        console.log('Received malformed packet, location packet doesn\'t contain game/location data');
        callbackError();
        return;
    }

    // Get the game and raw location
    const rawGame = packet.game;
    const rawLocation = packet.location;

    // Make sure the raw location contains the required fields
    if(!rawLocation.hasOwnProperty('latitude') || !rawLocation.hasOwnProperty('longitude')
        || !rawLocation.hasOwnProperty('altitude') || !rawLocation.hasOwnProperty('accuracy')
        || !rawLocation.hasOwnProperty('altitudeAccuracy')) {
        // Call back an error
        callbackError();
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

    // Parse the coordinate
    const coordinate = Coordinate.parse(rawLocation);
    if(coordinate == null) {
        callbackError();
        return;
    }

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

        // Get the live game
        Core.gameController.getGame(game, function(err, liveGame) {
            // Call back errors
            if(err !== null || liveGame == null) {
                callbackError();
                return;
            }

            /**
             * Get the game user
             */
            liveGame.getUser(user, function(err, liveUser) {
                // Call back errors
                if(err !== null || liveUser == null) {
                    callbackError();
                    return;
                }

                // Update the user location
                liveUser.updateLocation(coordinate);
            });
        });
    });
};

// Export the module
module.exports = GameChangeStageHandler;
