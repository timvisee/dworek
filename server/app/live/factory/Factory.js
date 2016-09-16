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

var mongo = require('mongodb');
var ObjectId = mongo.ObjectId;
var _ = require('lodash');

var config = require('../../../config');

var Core = require('../../../Core');
var PacketType = require('../../realtime/PacketType');
var FactoryModel = require('../../model/factory/FactoryModel');
var CallbackLatch = require('../../util/CallbackLatch');

/**
 * Factory class.
 *
 * @param {FactoryModel|ObjectId|string} factory Factory model instance or the ID of a factory.
 * @param {Game} game Game instance.
 *
 * @class
 * @constructor
 */
var Factory = function(factory, game) {
    /**
     * ID of the factory this object corresponds to.
     * @type {ObjectId}
     */
    this._id = null;

    /**
     * Factory model instance if available.
     * @type {FactoryModel|null} Factory model instance or null if no instance is currently available.
     */
    this._model = null;

    /**
     * Live game instance.
     * @type {Game} Game.
     * @private
     */
    this._game = game;

    /**
     * Create an array that tracks the users this factory is visible for.
     *
     * @type {Array} Array of object IDs as string.
     * @private
     */
    this._userVisibleMem = [];

    // Get and set the factory ID
    if(factory instanceof FactoryModel)
        this._id = factory.getId();
    else if(!(factory instanceof ObjectId) && ObjectId.isValid(factory))
        this._id = new ObjectId(factory);
    else if(!(factory instanceof ObjectId))
        throw new Error('Invalid factory instance or ID');
    else
        this._id = factory;

    // Store the factory model instance if any was given
    if(factory instanceof FactoryModel)
        this._model = factory;
};

/**
 * Get the factory ID for this factory.
 *
 * @return {ObjectId} Factory ID.
 */
Factory.prototype.getId = function() {
    return this._id;
};

/**
 * Get the hexadecimal ID representation of the factory.
 *
 * @returns {string} Factory ID as hexadecimal string.
 */
Factory.prototype.getIdHex = function() {
    return this.getId().toString();
};

/**
 * Check whether the give factory instance or ID equals this factory.
 *
 * @param {FactoryModel|ObjectId|string} factory Factory instance or the factory ID.
 * @return {boolean} True if this factory equals the given factory instance.
 */
Factory.prototype.isFactory = function(factory) {
    // Get the factory ID as an ObjectId
    if(factory instanceof FactoryModel)
        factory = factory.getId();
    else if(!(factory instanceof ObjectId) && ObjectId.isValid(factory))
        factory = new ObjectId(factory);
    else if(!(factory instanceof ObjectId))
        throw Error('Invalid factory ID');

    // Compare the factory ID
    return this._id.equals(factory);
};

/**
 * Get the factory model.
 *
 * @return {FactoryModel} Factory model instance.
 */
Factory.prototype.getFactoryModel = function() {
    // Return the model if it isn't null
    if(this._model !== null)
        return this._model;

    // Create a factory model for the known ID, store and return it
    return this._model = Core.model.factoryModelManager._instanceManager.create(this._id);
};

/**
 * Get the factory name.
 *
 * @param {Factory~getNameCallback} callback Callback with the result.
 */
Factory.prototype.getName = function(callback) {
    this.getFactoryModel().getName(callback);
};

/**
 * @callback Factory~getNameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {string=} Factory name.
 */

/**
 * Get the live game instance.
 * @return {Game} Game.
 */
Factory.prototype.getGame = function() {
    return this._game;
};

/**
 * Unload this live factory instance.
 *
 * @param {Factory~loadCallback} callback Called on success or when an error occurred.
 */
Factory.prototype.load = function(callback) {
    callback(null);
};

/**
 * Called on success or when an error occurred.
 *
 * @callback Factory~loadCallback
 * @param {Error|null} Error instance if an error occurred, null on success.kk
 */

/**
 * Unload this live factory instance.
 */
Factory.prototype.unload = function() {};

/**
 * @callback Factory~calculateCostCallback
 * @param {Error|null} Error instance if an error occurred.
 * @param {Number=} Factory cost.
 */

/**
 * Send the factory data to the given user.
 *
 * @param {UserModel} user User to send the packet data to.
 * @param {Array|*|undefined} sockets A socket, or array of sockets to send the data to, or null.
 * @param callback
 */
Factory.prototype.sendData = function(user, sockets, callback) {
    // Create a data object to send back
    var factoryData = {};

    // Store this instance
    const self = this;

    // Make sure we only call back once
    var calledBack = false;

    // Create a function to send the factory data packet
    const sendFactoryData = function() {
        // Create a packet object
        const packetObject = {
            factory: self.getIdHex(),
            game: self.getGame().getIdHex(),
            data: factoryData
        };

        // Check whether we've any sockets to send the data directly to
        if(sockets.length > 0)
            sockets.forEach(function(socket) {
                Core.realTime.packetProcessor.sendPacket(PacketType.FACTORY_DATA, packetObject, socket);
            });

        else
            Core.realTime.packetProcessor.sendPacketUser(PacketType.FACTORY_DATA, packetObject, user);
    };

    // Get the game
    const liveGame = this.getGame();
    const game = liveGame.getGameModel();

    // Get the factory model
    const factoryModel = this.getFactoryModel();

    // Make sure the factory is part of this game
    factoryModel.getGame(function(err, result) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Compare the games
        if(!game.getId().equals(result.getId())) {
            if(!calledBack)
                callback(new Error('The factory is not part of this game'));
            calledBack = true;
            return;
        }

        // Get the live factory
        factoryModel.getLiveFactory(function(err, liveFactory) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // TODO: Make sure the user has rights to view this factory!

            // Create a callback latch
            var latch = new CallbackLatch();

            // Get the factory name
            latch.add();
            factoryModel.getName(function(err, name) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Set the name
                factoryData.name = name;

                // Resolve the latch
                latch.resolve();
            });

            // Get the factory level
            latch.add();
            factoryModel.getLevel(function(err, level) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Set the level
                factoryData.level = level;

                // Resolve the latch
                latch.resolve();
            });

            // Get the defence value
            latch.add();
            factoryModel.getDefence(function(err, defence) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Set the defence
                factoryData.defence = defence;

                // Resolve the latch
                latch.resolve();
            });

            // Get the input
            latch.add();
            factoryModel.getIn(function(err, input) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Set the input
                factoryData.in = input;

                // Resolve the latch
                latch.resolve();
            });

            // Get the output
            latch.add();
            factoryModel.getOut(function(err, output) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Set the defence
                factoryData.out = output;

                // Resolve the latch
                latch.resolve();
            });

            // Get the creator
            latch.add();
            factoryModel.getUser(function(err, creator) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Get the display name of the user
                latch.add();
                creator.getDisplayName(function(err, displayName) {
                    // Call back errors
                    if(err !== null) {
                        if(!calledBack)
                            callback(err);
                        calledBack = true;
                        return;
                    }

                    // Set the display name
                    factoryData.creatorName = displayName;

                    // Resolve the latch
                    latch.resolve();
                });

                // Get the game user
                latch.add();
                Core.model.gameUserModelManager.getGameUser(game, creator, function(err, gameUser) {
                    // Call back errors
                    if(err !== null) {
                        if(!calledBack)
                            callback(err);
                        calledBack = true;
                        return;
                    }

                    // Get the team
                    gameUser.getTeam(function(err, team) {
                        // Call back errors
                        if(err !== null) {
                            if(!calledBack)
                                callback(err);
                            calledBack = true;
                            return;
                        }

                        // Get the team name
                        team.getName(function(err, teamName) {
                            // Call back errors
                            if(err !== null) {
                                if(!calledBack)
                                    callback(err);
                                calledBack = true;
                                return;
                            }

                            // Set the team name
                            factoryData.teamName = teamName;

                            // Resolve the latch
                            latch.resolve();
                        });
                    });
                });

                // Resolve the latch
                latch.resolve();
            });

            // Get the input production
            latch.add();
            self.calculateProductionIn(function(err, production) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Set the production
                factoryData.productionIn = production;

                // Resolve the latch
                latch.resolve();
            });

            // Get the output production
            latch.add();
            self.calculateProductionOut(function(err, production) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Set the production
                factoryData.productionOut = production;

                // Resolve the latch
                latch.resolve();
            });

            // Send the factory data
            latch.then(function() {
                sendFactoryData();
            });
        });
    });

    // Parse the sockets
    if(sockets == undefined)
        sockets = [];
    else if(!_.isArray(sockets))
        sockets = [sockets];
};

/**
 * Get the team of the factory.
 *
 * @param {function} callback callback(err, team)
 */
Factory.prototype.getTeam = function(callback) {
    this.getFactoryModel().getTeam(callback);
};

/**
 * Check whether this factory is visible for the given user.
 *
 * @param {User} user Given user.
 * @param {function} callback callback(err, isVisible)
 */
Factory.prototype.isVisibleFor = function(user, callback) {
    // Make sure a valid user is given
    if(user == null) {
        callback(null, false);
        return;
    }

    // Get the factory model and make sure it's valid
    const factoryModel = this.getFactoryModel();
    if(factoryModel == null) {
        callback(null, false);
        return;
    }

    // Get the game model
    var game = this.getGame().getGameModel();

    // Define the current instance
    const self = this;

    // Get the factory creator
    factoryModel.getUser(function(err, creator) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Call back true if the creator is the same as the user
        if(creator.getId().equals(user.getId())) {
            callback(null, true);
            return;
        }

        // Get the user state
        game.getUserState(user, function(err, userState) {
            // Call back errors
            if(err !== null) {
                callback(err);
                return;
            }

            // Call back false if the user isn't a player or spectator
            if(!userState.player && !userState.special) {
                callback(null, false);
                return;
            }

            // Call back true if the user is a spectator
            if(userState.spectator) {
                callback(null, true);
                return;
            }

            // Create a callback latch
            var latch = new CallbackLatch();

            // Make sure we only call back once
            var calledBack = false;

            // Get the factory team
            var factoryTeam;
            latch.add();
            self.getTeam(function(err, result) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Set the team
                factoryTeam = result;

                // Resolve the latch
                latch.resolve();
            });

            // Get the game user and team
            var userTeam;
            latch.add();
            Core.model.gameUserModelManager.getGameUser(game, user, function(err, gameUser) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Make sure the game user is valid
                if(gameUser == null) {
                    if(!calledBack)
                        callback(null, false);
                    calledBack = true;
                    return;
                }

                // Get the user state
                gameUser.getTeam(function(err, result) {
                    // Call back errors
                    if(err !== null) {
                        if(!calledBack)
                            callback(err);
                        calledBack = true;
                        return;
                    }

                    // Call back if the team is null
                    if(result == null) {
                        if(!calledBack)
                            callback(null, false);
                        calledBack = true;
                        return;
                    }

                    // Set the user team
                    userTeam = result;

                    // Resolve the latch
                    latch.resolve();
                });
            });

            // Continue if the teams are fetched
            latch.then(function() {
                // Call back if the teams are equal
                if(factoryTeam.getId().equals(userTeam.getId())) {
                    if(!calledBack)
                        callback(null, true);
                    calledBack = true;
                    return;
                }

                // TODO: Check the player positions! The player might be in range!

                // The factory probably isn't visible, call back false
                if(!calledBack)
                    callback(null, false);
            });
        });
    });
};

/**
 * Update the visibility state for the given user.
 *
 * @param {User} liveUser User to update the visibility state for.
 * @param {Factory~updateVisibilityMemoryCallback} callback Called with the result or when an error occurred.
 */
Factory.prototype.updateVisibilityMemory = function(liveUser, callback) {
    // Store this instance
    const self = this;

    // Check whether the user is visible
    this.isVisibleFor(liveUser, function(err, isVisible) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Get the memorized visibility state
        const lastState = self.isInVisibilityMemory(liveUser);

        // Return false if the state didn't change
        if(lastState == isVisible) {
            callback(null, false);
            return;
        }

        // Update the visibility array
        if(isVisible)
            self._userVisibleMem.push(liveUser);
        else
            self._userVisibleMem.splice(self._userVisibleMem.indexOf(liveUser), 1);

        // Call back the result
        callback(null, true);
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback Factory~updateVisibilityMemoryCallback
 * @param {Error|null} Error instance if an error occurred.
 * @param {boolean=} True if the state changed, false if not.
 */

/**
 * Check whether the given user is in the visibility memory.
 *
 * @param {User} liveUser User.
 */
Factory.prototype.isInVisibilityMemory = function(liveUser) {
    return this._userVisibleMem.indexOf(liveUser) >= 0;
};

/**
 * Calculate the input production per tick.
 *
 * @param callback (err, productionValue)
 */
Factory.prototype.calculateProductionIn = function(callback) {
    // Create a callback latch
    var latch = new CallbackLatch();
    var calledBack = false;

    // Get the game config and level
    var gameConfig = null;
    var level = null;

    // Get the game config
    latch.add();
    this.getGame().getConfig(function(err, result) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the game config
        gameConfig = result;

        // Resolve the latch
        latch.resolve();
    });

    // Get the factory level
    latch.add();
    this.getFactoryModel().getLevel(function(err, result) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the level
        level = result;

        // Resolve the latch
        latch.resolve();
    });

    // Calculate the production in
    latch.then(function() {
        callback(null, gameConfig.factory.calculateProductionIn(level));
    });
};

/**
 * Calculate the output production per tick.
 *
 * @param callback (err, productionValue)
 */
Factory.prototype.calculateProductionOut = function(callback) {
    // Create a callback latch
    var latch = new CallbackLatch();
    var calledBack = false;

    // Get the game config and level
    var gameConfig = null;
    var level = null;

    // Get the game config
    latch.add();
    this.getGame().getConfig(function(err, result) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the game config
        gameConfig = result;

        // Resolve the latch
        latch.resolve();
    });

    // Get the game level
    latch.add();
    this.getFactoryModel().getLevel(function(err, result) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the level
        level = result;

        // Resolve the latch
        latch.resolve();
    });

    // Calculate the production in
    latch.then(function() {
        callback(null, gameConfig.factory.calculateProductionOut(level));
    });
};

// Export the class
module.exports = Factory;

