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
const HANDLER_PACKET_TYPE = PacketType.FACTORY_DESTROY;

/**
 * Factory withdraw handler.
 *
 * @param {boolean=false} init True to initialize after constructing.
 *
 * @class
 * @constructor
 */
var FactoryDestroyHandler = function(init) {
    // Initialize
    if(init)
        this.init();
};

/**
 * Initialize the handler.
 */
FactoryDestroyHandler.prototype.init = function() {
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
FactoryDestroyHandler.prototype.handler = function(packet, socket) {
    // Make sure we only call back once
    var calledBack = false;

    // Remember the live game instance
    var liveGame = null;

    // Create a function to call back an error
    const callbackError = function(err) {
        // Print the error
        console.error('An error occurred while destroying a factory');
        if(err !== null && err !== undefined)
            console.error(err.stack || err);

        // Only call back once
        if(calledBack)
            return;

        // Set the called back flag
        calledBack = true;

        // Get the factory language name
        var langFactory = 'factory';
        if(liveGame !== null)
            langFactory = liveGame.__('factory.name');

        // Send a message to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to destroy the ' + langFactory + ', a server error occurred.',
            dialog: true
        }, socket);
    };

    // Make sure a session is given
    if(!packet.hasOwnProperty('factory') || !packet.hasOwnProperty('keepContents')) {
        console.log('Received malformed packet');
        callbackError(new Error('Malformed packet'));
        return;
    }

    // Get the raw parameters
    const rawFactory = packet.factory;
    const keepContents = !!packet.keepContents;

    // Make sure the user is authenticated
    if(!_.has(socket, 'session.valid') || !socket.session.valid) {
        // Get the factory language name
        var langFactory = 'factory';
        if(liveGame !== null)
            langFactory = liveGame.__('factory.name');

        // Send a message response to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to destroy the ' + langFactory + ', you\'re not authenticated.',
            dialog: true
        }, socket);
        return;
    }

    // Get the user
    const user = socket.session.user;

    // Get the factory
    Core.model.factoryModelManager.isValidFactoryId(rawFactory, function(err, isValidFactory) {
        // Call back errors
        if(!isValidFactory || err !== null) {
            callbackError(err);
            return;
        }

        // Create a factory model instance
        const factoryModel = Core.model.factoryModelManager._instanceManager.create(rawFactory);

        // Get the game
        factoryModel.getGame(function(err, game) {
            // Callback errors
            if(err !== null) {
                callbackError(err);
                return;
            }

            // Get the live game instance
            Core.gameManager.getGame(game, function(err, result) {
                // Make sure the live game was found
                if(err === null && (result === null || result === undefined))
                    err = new Error('Failed to get live game instance');

                // Callback errors
                if(err !== null) {
                    callbackError(err);
                    return;
                }

                // Set the live game instance
                liveGame = result;

                // Check whether the user has management permissions
                game.hasManagePermission(user, function(err, hasManagementPermission) {
                    // Callback errors
                    if(err !== null) {
                        callbackError(err);
                        return;
                    }

                    // Get the game user
                    Core.model.gameUserModelManager.getGameUser(game, user, function(err, gameUser) {
                        // Make sure the game user is found
                        if(err === null && (gameUser === undefined || gameUser === null))
                            err = new Error('Failed to get game user.');

                        // Callback errors
                        if(err !== null) {
                            callbackError(err);
                            return;
                        }

                        // Create a permission latch that must be resolved in order to continue
                        const permissionLatch = new CallbackLatch();

                        // Make sure the user is in the owning team of this factory, if the user doesn't have management permissions
                        if(!hasManagementPermission) {
                            permissionLatch.add();

                            // Get the team for the user
                            gameUser.getTeam(function(err, team) {
                                // Callback errors
                                if(err !== null) {
                                    callbackError(err);
                                    return;
                                }

                                // The user must be in the correct team
                                if(team === undefined || team === null) {
                                    // Send a message response to the user
                                    Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                        error: true,
                                        message: 'You do not have permission to destroy this ' + liveGame.__('factory.name') + '.',
                                        dialog: true
                                    }, socket);
                                    return;
                                }

                                // Get the team of the factory to compare it to
                                factoryModel.getTeam(function(err, factoryTeam) {
                                    // Callback errors
                                    if(err !== null) {
                                        callbackError(err);
                                        return;
                                    }

                                    // The user must be in the same team
                                    if(factoryTeam === null || factoryTeam === undefined || !team.getId().equals(factoryTeam.getId())) {
                                        // Send a message response to the user
                                        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                            error: true,
                                            message: 'You do not have permission to destroy this ' + liveGame.__('factory.name') + '.',
                                            dialog: true
                                        }, socket);
                                        return;
                                    }

                                    // Resolve the permission latch
                                    permissionLatch.resolve();
                                });
                            });
                        }

                        permissionLatch.then(function() {
                            // Determine whether the user must be in range
                            const mustBeInRange = !hasManagementPermission && keepContents;

                            // Create a latch for the range check
                            const rangeLatch = new CallbackLatch();

                            // Check whether we're in range
                            if(mustBeInRange) {
                                rangeLatch.add();

                                // Get the live user
                                gameUser.getLiveUser(function(err, liveUser) {
                                    // Make sure the live user instance is available
                                    if(err === null && (liveUser === null || liveUser === undefined))
                                        err = new Error('Failed to get live user instance');

                                    // Callback errors
                                    if(err !== null) {
                                        callbackError(err);
                                        return;
                                    }

                                    // Make sure the user has a recent location
                                    if(!liveUser.hasRecentLocation()) {
                                        // Get the factory language name
                                        var langFactory = liveGame.__('factory.name');

                                        // Send a message response to the user
                                        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                            error: true,
                                            message: 'Unable to destroy the ' + langFactory + '. Your location is outdated.<br><br>' +
                                                'Please make sure your location services are working properly, then try to delete the ' + langFactory + ' again.',
                                            dialog: true
                                        }, socket);
                                        return;
                                    }

                                    // Get the live factory
                                    factoryModel.getLiveFactory(function(err, liveFactory) {
                                        // Make sure the live factory instance was found
                                        if(err === null && (liveFactory === undefined || liveFactory === null))
                                            err = new Error('Failed to get live factory instance');

                                        // Callback errors
                                        if(err !== null) {
                                            callbackError(err);
                                            return;
                                        }

                                        // Make sure the user is in range
                                        liveFactory.isUserInRange(liveUser, function(err, inRange) {
                                            // Callback errors
                                            if(err !== null) {
                                                callbackError(err);
                                                return;
                                            }

                                            // The user must be in range
                                            if(!inRange) {
                                                // Get the factory language name
                                                var langFactory = liveGame.__('factory.name');

                                                // Send a message response to the user
                                                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                                    error: true,
                                                    message: 'Unable to destroy the ' + langFactory + '. You are currently not in range.<br><br>' +
                                                    'Please try to destroy the ' + langFactory + ' again when you\'re back in range of the ' + langFactory + '.',
                                                    dialog: true
                                                }, socket);
                                                return;
                                            }

                                            // Resolve the range latch
                                            rangeLatch.resolve();
                                        });
                                    });
                                });
                            }

                            // We're in range, continue
                            rangeLatch.then(function() {
                                // Create a content latch
                                var contentsLatch = new CallbackLatch();

                                // Process the contents when they should be kept
                                if(keepContents) {
                                    // Spread the contents of the factory
                                    contentsLatch.add();
                                    factoryModel.spreadContents(false, function(err) {
                                        // Call back errors
                                        if (err !== null) {
                                            callbackError(err);
                                            return;
                                        }

                                        // Resolve the latch
                                        contentsLatch.resolve();
                                    });
                                }

                                // We're done with all the transfers
                                contentsLatch.then(function() {
                                    // Get the live factory
                                    factoryModel.getLiveFactory(function(err, liveFactory) {
                                        // Call back errors
                                        if (err !== null) {
                                            callbackError(err);
                                            return;
                                        }

                                        // Destroy the factory
                                        liveFactory.destroy(function() {
                                            // Call back errors
                                            if(err !== null) {
                                                callbackError(err);
                                                return;
                                            }

                                            // Loop through the live users in this game to send them the broadcast
                                            liveGame.userManager.users.forEach(function(recipent) {
                                                // Send the factory destroyed packet to everybody
                                                Core.realTime.packetProcessor.sendPacketUser(PacketType.FACTORY_DESTROYED, {
                                                    factory: factoryModel.getIdHex(),
                                                    broadcast: false
                                                }, recipent.getUserModel());
                                            });

                                            // Send game data to everyone
                                            Core.gameManager.sendGameDataToAll(game, function(err) {
                                                // Handle errors
                                                if(err !== null) {
                                                    console.error('An error occurred when broadcasting the game data to everybody');
                                                    console.error(err.stack || err);
                                                }
                                            });

                                            // Broadcast the updated location data to all players
                                            Core.gameManager.broadcastLocationData(3000, game, undefined, undefined, function(err) {
                                                // Handle errors
                                                if(err !== null) {
                                                    console.error('An error occurred when broadcasting the updated location data to everybody');
                                                    console.error(err.stack || err);
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
    });
};

// Export the module
module.exports = FactoryDestroyHandler;
