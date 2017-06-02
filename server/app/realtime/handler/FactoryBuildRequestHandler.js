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

var gameConfig = require('../../../gameConfig');

var Core = require('../../../Core');
var PacketType = require('../PacketType');
var CallbackLatch = require('../../util/CallbackLatch');
var Validator = require('../../validator/Validator');
var FactoryDatabase = require('../../model/factory/FactoryDatabase');

/**
 * Type of packets to handle by this handler.
 * @type {number} Packet type.
 */
const HANDLER_PACKET_TYPE = PacketType.FACTORY_BUILD_REQUEST;

/**
 * Location update handler.
 *
 * @param {boolean=false} init True to initialize after constructing.
 *
 * @class
 * @constructor
 */
var FactoryBuildRequestHandler = function(init) {
    // Initialize
    if(init)
        this.init();
};

/**
 * Initialize the handler.
 */
FactoryBuildRequestHandler.prototype.init = function() {
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
FactoryBuildRequestHandler.prototype.handler = function(packet, socket) {
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
            message: 'Failed to build factory, an error occurred.',
            dialog: true
        }, socket);

        // Set the called back flag
        calledBack = true;

        // Print the error to the console if anything is given
        if(err != undefined) {
            console.error('Failed to build factory on client request:');
            console.error(err);
        }
    };

    // Make sure a session is given
    if(!packet.hasOwnProperty('game') || !packet.hasOwnProperty('name')) {
        console.log('Received malformed packet, factory build packet does not contain required data');
        callbackError();
        return;
    }

    // Get the game and name
    const rawGame = packet.game;
    const rawName = packet.name;

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

    // Validate the name
    if(!Validator.isValidFactoryName(rawName)) {
        // Send a message response to the user
        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
            error: true,
            message: 'Failed to build factory, this factory name is not allowed.',
            dialog: true
        }, socket);
        return;
    }

    // Format the name
    const factoryName = Validator.formatFactoryName(rawName);

    // Get the game instance by it's ID
    Core.model.gameModelManager.getGameById(rawGame, function(err, game) {
        // Handle errors
        if(err !== null || game == null) {
            // Print the error to the console
            console.error(err);

            // Call back an error
            callbackError(err);
            return;
        }

        // Make sure the game is active
        game.getStage(function(err, stage) {
            // Call back errors
            if(err !== null || stage != 1) {
                callbackError(err);
                return;
            }

            // Get the live game instance
            Core.gameManager.getGame(game, function(err, liveGame) {
                // Call back errors
                if(err !== null || liveGame == null) {
                    callbackError(err);
                    return;
                }

                // Get the game user
                liveGame.getUser(user, function(err, liveUser) {
                    // Call back errors
                    if(err !== null || liveUser == null) {
                        callbackError(err);
                        return;
                    }

                    // Make sure we know the last location of the user
                    if(!liveUser.hasLocation()) {
                        // Send a message response to the user
                        Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                            error: true,
                            message: 'Failed to build factory, we don\'t know your position yet. Please make sure your location service and GPS is enabled.',
                            dialog: true
                        }, socket);
                        return;
                    }

                    // Get the users location
                    const factoryLocation = liveUser.getLocation();

                    // Get the user's team
                    liveUser.getTeam(function(err, team) {
                        // Call back errors
                        if(err !== null) {
                            callbackError(err);
                            return;
                        }

                        // Make sure the user has a team
                        if(team == null) {
                            callbackError();
                            return;
                        }

                        // Calculate the factory cost
                        liveGame.calculateFactoryCost(team, function(err, factoryCost) {
                            // Call back errors
                            if(err !== null) {
                                callbackError(err);
                                return;
                            }

                            // Make sure the user has enough money
                            liveUser.getMoney(function(err, money) {
                                // Call back errors
                                if(err !== null) {
                                    callbackError(err);
                                    return;
                                }

                                // Make sure the user has enough money
                                if(money < factoryCost) {
                                    // Send a message response to the user
                                    Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                        error: true,
                                        message: 'You don\'t have enough money to build a factory.',
                                        dialog: true
                                    }, socket);
                                    return;
                                }

                                // Create an interspace latch
                                var interspaceLatch = new CallbackLatch();

                                // Create a flag, to define whether any factory is too close
                                var isTooClose = false;

                                liveGame.factoryManager.factories.forEach(function(factory) {
                                    // Return if we we're too close, because we should stop the loop
                                    if(isTooClose)
                                        return;

                                    // Get the location of the entry factory
                                    interspaceLatch.add();
                                    factory.getFactoryModel().getLocation(function(err, entryLocation) {
                                        // Call back errors
                                        if(err !== null) {
                                            callbackError(err);
                                            return;
                                        }

                                        // Get the distance between the new factory and the entry
                                        if(factoryLocation.getDistanceTo(entryLocation) < gameConfig.factory.interspaceMin) {
                                            // Send a notification to the user if this is the first factory that is too close
                                            if(!isTooClose) {
                                                // Send a message response to the user
                                                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                                    error: true,
                                                    // TODO: Dynamically get factory name from game name configuration!
                                                    message: 'It looks like there another lab close by!<br><br>' +
                                                            'To build a new lab, you must be at least ' + gameConfig.factory.interspaceMin + ' meters away from any other lab.',
                                                    dialog: true
                                                }, socket);
                                            }

                                            // Set the flag
                                            isTooClose = true;

                                        } else
                                            // Resolve a latch
                                            interspaceLatch.resolve();
                                    });
                                });

                                // Continue when the latch is complete
                                interspaceLatch.then(function() {
                                    // Subtract the money
                                    liveUser.subtractMoney(factoryCost, function(err, callback) {
                                        // Call back errors
                                        if(err !== null) {
                                            callbackError(err);
                                            return;
                                        }

                                        // Add the factory
                                        FactoryDatabase.addFactory(factoryName, game, team, user, factoryLocation, function (err, factoryModel) {
                                            // Call back errors
                                            if (err !== null) {
                                                callbackError(err);
                                                return;
                                            }

                                            // Load the factory in the live game
                                            liveGame.factoryManager.getFactory(factoryModel, function(err) {
                                                // Call back errors
                                                if(err !== null) {
                                                    callbackError(err);
                                                    return;
                                                }

                                                // Create a callback latch
                                                var latch = new CallbackLatch();

                                                // Get the factory name, the name of the user and name of the team
                                                var factoryName = null;
                                                var userName = null;
                                                var userTeamName = null;

                                                // Get the factory name
                                                latch.add();
                                                factoryModel.getName(function(err, result) {
                                                    // Call back errors
                                                    if(err !== null) {
                                                        if(!calledBack)
                                                            callback(err);
                                                        calledBack = true;
                                                        return;
                                                    }

                                                    // Set the factory name
                                                    factoryName = result;

                                                    // Resolve the latch
                                                    latch.resolve();
                                                });

                                                // Get the user name
                                                latch.add();
                                                user.getDisplayName(function(err, result) {
                                                    // Call back errors
                                                    if(err !== null) {
                                                        if(!calledBack)
                                                            callback(err);
                                                        calledBack = true;
                                                        return;
                                                    }

                                                    // Set the user name
                                                    userName = result;

                                                    // Resolve the latch
                                                    latch.resolve();
                                                });

                                                // Get the team name
                                                latch.add();
                                                team.getName(function(err, result) {
                                                    // Call back errors
                                                    if(err !== null) {
                                                        if(!calledBack)
                                                            callback(err);
                                                        calledBack = true;
                                                        return;
                                                    }

                                                    // Set the team name
                                                    userTeamName = result;

                                                    // Resolve the latch
                                                    latch.resolve();
                                                });

                                                // Send a broadcast to all relevant users when we fetched the data
                                                latch.then(function() {
                                                    // Loop through the list of users
                                                    liveUser.getGame().userManager.users.forEach(function(otherUser) {
                                                        // Get the user's team
                                                        otherUser.getTeam(function(err, otherTeam) {
                                                            // Handle errors
                                                            if(err !== null) {
                                                                console.error('Failed to fetch user team, ignoring');
                                                                console.error(err);
                                                            }

                                                            // Make sure the user's team is known
                                                            if(otherTeam == null)
                                                                return;

                                                            // Check whether this is the user itself
                                                            const isSelf = user.getId().equals(otherUser.getId());

                                                            // Make sure the user is in the builder's team
                                                            if(!isSelf && !team.getId().equals(otherTeam.getId()))
                                                                return;

                                                            // Send a capture update
                                                            Core.realTime.packetProcessor.sendPacketUser(PacketType.FACTORY_BUILD, {
                                                                factory: factoryModel.getId(),
                                                                factoryName,
                                                                self: isSelf,
                                                                userName
                                                            }, otherUser.getUserModel());
                                                        });
                                                    });
                                                });

                                                // Send new game data to everyone
                                                Core.gameManager.sendGameDataToAll(game, function (err) {
                                                    // Handle errors
                                                    if (err !== null) {
                                                        console.error('Failed to send game data updates, ignoring');
                                                        console.error(err);
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
    });
};

// Export the module
module.exports = FactoryBuildRequestHandler;
