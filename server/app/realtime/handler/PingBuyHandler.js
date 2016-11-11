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
var Coordinate = require('../../coordinate/Coordinate');
var CallbackLatch = require('../../util/CallbackLatch');

/**
 * Type of packets to handle by this handler.
 * @type {number} Packet type.
 */
const HANDLER_PACKET_TYPE = PacketType.PING_BUY;

/**
 * Location update handler.
 *
 * @param {boolean=false} init True to initialize after constructing.
 *
 * @class
 * @constructor
 */
var PingBuyHandler = function(init) {
    // Initialize
    if(init)
        this.init();
};

/**
 * Initialize the handler.
 */
PingBuyHandler.prototype.init = function() {
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
PingBuyHandler.prototype.handler = function(packet, socket) {
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
            message: 'Failed to buy upgrade, a server error occurred.',
            dialog: true
        }, socket);

        // Set the called back flag
        calledBack = true;
    };

    // Make sure the correct data is given
    if(!packet.hasOwnProperty('game') || !packet.hasOwnProperty('pingId') || !packet.hasOwnProperty('cost')) {
        console.log('Received malformed packet');
        callbackError();
        return;
    }

    // Get the raw parameters
    const rawGame = packet.game;
    const rawPingId = packet.pingId;
    const rawCost = packet.cost;

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

    // Get the game
    Core.model.gameModelManager.getGameById(rawGame, function(err, gameModel) {
        // Call back errors
        if(err !== null) {
            callbackError();
            return;
        }

        // Get the game user
        Core.model.gameUserModelManager.getGameUser(gameModel, user, function(err, gameUser) {
            // Call back errors
            if(err !== null) {
                callbackError();
                return;
            }

            // Get the user's team
            gameUser.getTeam(function(err, teamModel) {
                // Call back errors
                if(err !== null) {
                    callbackError();
                    return;
                }

                // Make sure the game user has a team
                if(teamModel == null) {
                    Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                        error: true,
                        message: 'Failed to execute ping, because you aren\'t part of any team.',
                        dialog: true
                    }, socket);
                    return;
                }

                // Get the live game
                Core.gameController.getGame(gameModel, function(err, liveGame) {
                    // Call back errors
                    if(err !== null) {
                        callbackError();
                        return;
                    }

                    // Get the standings for the team
                    liveGame.getTeamMoney(teamModel, function(err, teamStandingsFiltered) {
                        // Call back errors
                        if(err !== null) {
                            callbackError();
                            return;
                        }

                        // Make sure the money for the current team is included
                        var teamMoney = 0;
                        var gotTeamMoney = false;
                        teamStandingsFiltered.forEach(function(teamStanding) {
                            // Skip if we already got the team money
                            if(gotTeamMoney)
                                return;

                            // Compare the teams
                            if(teamModel.getId().equals(teamStanding.id)) {
                                teamMoney = teamStanding.money;
                                gotTeamMoney = true;
                            }
                        });

                        // Make sure we indeed got the team money
                        if(!gotTeamMoney) {
                            callbackError();
                            return;
                        }

                        // Get the pings for the current user
                        const pings = gameConfig.ping.getPings(teamMoney);

                        // Loop through the pings until we find one with the same ID
                        var selectedPing = null;
                        pings.forEach(function(ping) {
                            // Skip if we found the ping
                            if(selectedPing !== null)
                                return;

                            // Compare the ID
                            if(ping.id == rawPingId)
                                selectedPing = ping;
                        });

                        // Make sure a ping is found
                        if(selectedPing == null) {
                            callbackError();
                            return;
                        }

                        // Compare the current cost of the ping to the cost send along with the packet
                        if(selectedPing.price != rawCost) {
                            Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                error: true,
                                message: 'The price of this ping seems to have been changed while executing it, therefore your ping hasn\'t been executed to prevent problems.<br><br>' +
                                'Please try to execute the ping again with the updated price.',
                                dialog: true
                            }, socket);
                            return;
                        }

                        // Get the live user instance
                        liveGame.userManager.getUser(user, function(err, liveUser) {
                            // Call back errors
                            if(err !== null || liveUser == null) {
                                callbackError();
                                return;
                            }

                            // Make sure the user has a recent location
                            if(!liveUser.hasRecentLocation()) {
                                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                    error: true,
                                    message: 'Failed to execute ping. We don\'t know what location you\'re currently at, your location might be outdated.<br><br>' +
                                    'Please ensure that your GPS is working correctly.',
                                    dialog: true
                                }, socket);
                                return;
                            }

                            // Get the user's recent location
                            const userLocation = liveUser.getLocation();

                            // Make sure the user has enough money
                            gameUser.getMoney(function(err, money) {
                                // Call back errors
                                if(err !== null) {
                                    callbackError();
                                    return;
                                }

                                // Make sure the user has enough money
                                if(money < selectedPing.price) {
                                    Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                        error: true,
                                        message: 'Failed to execute ping, you don\'t have enough money.',
                                        dialog: true
                                    }, socket);
                                    return;
                                }

                                // Subtract the money
                                gameUser.subtractMoney(selectedPing.price, function(err) {
                                    // Call back errors
                                    if (err !== null) {
                                        callbackError();
                                        return;
                                    }

                                    // Create a callback latch
                                    var latch = new CallbackLatch();

                                    // Create an array of applicable factories, and their distance
                                    var applicableFactories = [];

                                    // Loop through the list of factories, and determine
                                    liveGame.factoryManager.factories.forEach(function(factory) {
                                        // Make sure the factory is valid
                                        if(factory == null)
                                            return;

                                        // Add the normal latch, and keep track of whether we resolved it
                                        latch.add();
                                        var isResolved = false;

                                        // Create a callback latch for the factory
                                        var factoryLatch = new CallbackLatch();

                                        // Create a variable for the factory distance
                                        var factoryDistance = null;

                                        // Make sure the factory isn't already visible
                                        factoryLatch.add();
                                        factory.isVisibleFor(liveUser, function(err, result) {
                                            // Call back errors
                                            if(err !== null) {
                                                callbackError();
                                                if(!isResolved) {
                                                    isResolved = true;
                                                    latch.resolve();
                                                }
                                                return;
                                            }

                                            // Don't add the factory if it's already visible
                                            if(!result) {
                                                if(!isResolved) {
                                                    isResolved = true;
                                                    latch.resolve();
                                                }
                                                return;
                                            }

                                            // Resolve the factory latch
                                            factoryLatch.resolve();
                                        });

                                        // Get the factory team
                                        factoryLatch.add();
                                        factory.getTeam(function(err, factoryTeam) {
                                            // Call back errors
                                            if(err !== null || liveUser == null) {
                                                callbackError();
                                                if(!isResolved) {
                                                    isResolved = true;
                                                    latch.resolve();
                                                }
                                                return;
                                            }

                                            // Make sure the factory team is known
                                            if(factoryTeam == null) {
                                                if(!isResolved) {
                                                    isResolved = true;
                                                    latch.resolve();
                                                }
                                                return;
                                            }

                                            // Make sure the factory isn't ally
                                            if(factoryTeam.getId().equals(teamModel.getId())) {
                                                if(!isResolved) {
                                                    isResolved = true;
                                                    latch.resolve();
                                                }
                                                return;
                                            }

                                            // Resolve the factory latch
                                            factoryLatch.resolve();
                                        });

                                        // Get the factory location
                                        factoryLatch.add();
                                        factory.getFactoryModel().getLocation(function(err, factoryLocation) {
                                            // Call back errors
                                            if(err !== null || liveUser == null) {
                                                callbackError();
                                                if(!isResolved) {
                                                    isResolved = true;
                                                    latch.resolve();
                                                }
                                                return;
                                            }

                                            // Make sure the factory location is known
                                            if(factoryLocation == null) {
                                                if(!isResolved) {
                                                    isResolved = true;
                                                    latch.resolve();
                                                }
                                                return;
                                            }

                                            // Calculate the distance to the user
                                            factoryDistance = userLocation.getDistanceTo(factoryLocation);

                                            // Make sure the factory is in-range
                                            if(selectedPing.range >= 0 && factoryDistance > selectedPing.range) {
                                                if(!isResolved) {
                                                    isResolved = true;
                                                    latch.resolve();
                                                }
                                                return;
                                            }

                                            // Resolve the latch
                                            factoryLatch.resolve();
                                        });

                                        // Add the factory to a list when we're done
                                        factoryLatch.then(function() {
                                            // Create an object to add in the list of factories
                                            applicableFactories.push({
                                                liveFactory: factory,
                                                distance: factoryDistance
                                            });

                                            // Resolve the latch
                                            if(!isResolved)
                                                latch.resolve();
                                        });
                                    });

                                    // We're done fetching factories
                                    latch.then(function() {
                                        // Determine the factory count
                                        var factoryCount = applicableFactories.length;
                                        if(selectedPing.max > 0 && factoryCount > selectedPing.max)
                                            factoryCount = selectedPing.max;

                                        // Show a message to the user about the factories we found
                                        // TODO: Fetch the factory names from the games configuration!
                                        if(factoryCount  > 0) {
                                            Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                                error: false,
                                                message: 'You pinged one ' + factoryCount + ' enemy lab' + (factoryCount != 1 ? 's' : '') + '!<br><br>' +
                                                (factoryCount != 1 ? 'The labs are now visible on your map.' : 'The lab is now visible on your map.') + ' ' +
                                                'Take a quick look because ' + (factoryCount != 1 ? 'they disappear' : 'it disappears') + ' in ' + (selectedPing.duration / 1000) + ' seconds.',
                                                dialog: true,
                                                toast: false,
                                                vibrate: true
                                            }, socket);
                                        } else {
                                            Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                                error: false,
                                                message: 'You didn\'t ping any enemy labs!',
                                                dialog: false,
                                                toast: true,
                                                vibrate: true
                                            }, socket);
                                        }

                                        // Sort the list of factories
                                        applicableFactories.sort(function(a, b) {
                                            return a.distance - b.distance;
                                        });

                                        // Ping each factory
                                        for(var i = 0; i < factoryCount; i++) {
                                            // Get the factory
                                            const currentFactory = applicableFactories[i].liveFactory;

                                            // Ping the factory for the user
                                            currentFactory.pingFor(liveUser, selectedPing.duration, false, function (err) {
                                                // Show the error in the console
                                                if (err !== null) {
                                                    console.err('Failed to ping factory for user.');
                                                    console.err(err);
                                                    return;
                                                }

                                                // Show a notification to the user
                                                // TODO: Get the factory name from the game's configuration
                                                Core.realTime.packetProcessor.sendPacket(PacketType.MESSAGE_RESPONSE, {
                                                    error: false,
                                                    message: 'One of your pinged labs has decayed...',
                                                    dialog: false,
                                                    toast: true
                                                }, socket);
                                            });
                                        }

                                        // Send updated location data to the user
                                        Core.gameController.broadcastLocationData(liveUser.getGame().getGameModel(), liveUser.getUserModel(), undefined, function(err) {
                                            // Show errors
                                            if(err !== null) {
                                                console.error('Failed to broadcast location data to user.');
                                                console.error(err);
                                            }
                                        });

                                        // Send updated game data to all users
                                        Core.gameController.sendGameDataToAll(liveUser.getGame().getGameModel(), function(err) {
                                            // Show errors
                                            if(err !== null) {
                                                console.error('Failed to broadcast game data to all users.');
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
};

// Export the module
module.exports = PingBuyHandler;
