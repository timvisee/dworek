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
var geolib = require('geolib');

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

    /**
     * Range of the factory in meters.
     * The value might be null if the range is unspecified.
     * @type {Number|null}
     * @private
     */
    this._range = null;

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
 * @param {Array|*|undefined} sockets A socket, or array of sockets to send the data to, or undefined.
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

        // Call back
        callback(null);
    };

    // Get the game
    const liveGame = this.getGame();
    const game = liveGame.getGameModel();

    // Get the factory model
    const factoryModel = this.getFactoryModel();

    // Create a callback latch
    var latch = new CallbackLatch();

    // Parse the sockets
    if(sockets == undefined)
        sockets = [];
    else if(!_.isArray(sockets))
        sockets = [sockets];

    // Get the game user
    latch.add();
    this.getGame().getUser(user, function(err, liveUser) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Check whether this factory is visible for the given live user
        self.isVisibleFor(liveUser, function(err, visible) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Set the visibility status
            factoryData.visible = visible;

            // Resolve the latch
            latch.resolve();
        });
    });

    // Check whether the user can modify the factory
    latch.add();
    self.canModify(user, function(err, canModify) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the modify permission status
        factoryData.canModify = canModify;

        // Resolve the latch
        latch.resolve();
    });

    // Continue when we're done
    latch.then(function() {
        // Send the data if no visible
        if(!factoryData.visible) {
            sendFactoryData();
            return;
        }

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

                // Reset the latch
                latch.identity();

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
                        factoryModel.getTeam(function(err, factoryTeam) {
                            // Call back errors
                            if(err !== null) {
                                if(!calledBack)
                                    callback(err);
                                calledBack = true;
                                return;
                            }

                            // Get the team name
                            factoryTeam.getName(function(err, teamName) {
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
                self.getProductionIn(function(err, production) {
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
                self.getProductionOut(function(err, production) {
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

                // Get the defence upgrades
                latch.add();
                self.getDefenceUpgrades(function(err, defenceUpgrades) {
                    // Call back errors
                    if(err !== null) {
                        if(!calledBack)
                            callback(err);
                        calledBack = true;
                        return;
                    }

                    // Set the production
                    factoryData.defenceUpgrades = defenceUpgrades;

                    // Resolve the latch
                    latch.resolve();
                });

                // Get the next level cost
                latch.add();
                self.getNextLevelCost(function(err, nextLevelCost) {
                    // Call back errors
                    if(err !== null) {
                        if(!calledBack)
                            callback(err);
                        calledBack = true;
                        return;
                    }

                    // Set the production
                    factoryData.nextLevelCost = nextLevelCost;

                    // Resolve the latch
                    latch.resolve();
                });

                // Send the factory data
                latch.then(function() {
                    sendFactoryData();
                });
            });
        });
    });
};

/**
 * Broadcast the factory data to all relevant users.
 *
 * @param {Factory~broadcastDataCallback} [callback] Called on success or when an error occurred.
 */
Factory.prototype.broadcastData = function(callback) {
    // Store the current instance
    const self = this;

    // Create a callback latch
    var latch = new CallbackLatch();

    // Only call back once
    var calledBack = false;

    // Loop through the list of live users for this factory
    this.getGame().userManager.users.forEach(function(liveUser) {
        // Make sure the factory is visible for the user
        latch.add();
        self.isVisibleFor(liveUser, function(err, visible) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    if(_.isFunction(callback))
                        callback(err);
                calledBack = true;
                return;
            }

            // Send the game data if the factory is visible for the current live user
            if(visible)
                // Send the data
                self.sendData(liveUser.getUserModel(), undefined, function(err) {
                    // Call back errors
                    if(err !== null) {
                        if(!calledBack)
                            if(_.isFunction(callback))
                                callback(err);
                        calledBack = true;
                        return;
                    }

                    // Resolve the latch
                    latch.resolve();
                });

            else
                // Resolve the latch if the factory isn't visible
                latch.resolve();
        });
    });

    // Call back when we're done
    latch.then(() => {
        if(_.isFunction(callback))
            callback(null);
    });
};

/**
 * Called on success or when an error occurred.
 *
 * @callback Factory~broadcastDataCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

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
 * @param {User} liveUser Given user.
 * @param {function} callback callback(err, isVisible)
 */
Factory.prototype.isVisibleFor = function(liveUser, callback) {
    // Make sure a valid user is given
    if(liveUser == null) {
        callback(null, false);
        return;
    }

    // Get the factory model and make sure it's valid
    const factoryModel = this.getFactoryModel();
    if(factoryModel == null) {
        callback(null, false);
        return;
    }

    // Get the user and game model
    const userModel = liveUser.getUserModel();
    const gameModel = this.getGame().getGameModel();

    // Define the current instance
    const self = this;

    // Get the user state
    gameModel.getUserState(userModel, function(err, userState) {
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
        Core.model.gameUserModelManager.getGameUser(gameModel, userModel, function(err, gameUser) {
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

            // Get the team
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

            // Check whether the given user is in range
            self.isUserInRange(liveUser, function(err, inRange) {
                // The factory probably isn't visible, call back false
                if(!calledBack)
                    callback(null, inRange);
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

    // Call back if the user is null
    if(liveUser == null) {
        callback(null);
        return;
    }

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

        // Send the factory data
        self.sendData(liveUser.getUserModel(), undefined, function(err) {
            // Call back errors
            if(err !== null) {
                callback(err);
                return;
            }

            // Call back
            callback(null, true);
        });
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
Factory.prototype.getProductionIn = function(callback) {
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
        callback(null, gameConfig.factory.getProductionIn(level));
    });
};

/**
 * Calculate the output production per tick.
 *
 * @param callback (err, productionValue)
 */
Factory.prototype.getProductionOut = function(callback) {
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
        callback(null, gameConfig.factory.getProductionOut(level));
    });
};

/**
 * Calculate the cost of the next level.
 *
 * @param callback (err, levelCost)
 */
Factory.prototype.getNextLevelCost = function(callback) {
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
        callback(null, gameConfig.factory.getLevelCost(level + 1));
    });
};

/**
 * Get the defence upgrades object.
 *
 * @param callback (err, upgradesObject)
 */
Factory.prototype.getDefenceUpgrades = function(callback) {
    // Create a callback latch
    var latch = new CallbackLatch();
    var calledBack = false;

    // Get the game config and level
    var gameConfig = null;
    var defence = null;

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

    // Get the defence
    latch.add();
    this.getFactoryModel().getDefence(function(err, result) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the defence
        defence = result;

        // Resolve the latch
        latch.resolve();
    });

    // Get the upgrades
    latch.then(function() {
        callback(null, gameConfig.factory.getDefenceUpgrades(defence));
    });
};

/**
 * Check whether the given user can modify this factory.
 * @param {UserModel} user
 * @param callback callback(err, canModify)
 */
Factory.prototype.canModify = function(user, callback) {
    var latch = new CallbackLatch();
    const self = this;

    var calledBack = false;

    var factoryTeam = null;
    var userTeam = null;

    latch.add();
    this.getTeam(function(err, team) {
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        factoryTeam = team;

        latch.resolve();
    });

    latch.add();
    Core.model.gameUserModelManager.getGameUser(this.getGame().getGameModel(), user, function(err, gameUser) {
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        gameUser.getTeam(function(err, team) {
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            userTeam = team;

            latch.resolve();
        });
    });

    latch.then(function() {
        if(factoryTeam == null || userTeam == null) {
            callback(null, false);
            return;
        }

        if(!factoryTeam.getId().equals(userTeam.getId())) {
            callback(null, false);
            return;
        }

        self.getGame().getUser(user, function(err, liveUser) {
            if(err !== null) {
                callback(err);
                return;
            }

            self.isUserInRange(liveUser, function(err, inRange) {
                if(err !== null) {
                    callback(err);
                    return;
                }

                callback(null, inRange);
            });
        });
    });
};

/**
 * Check whether the given live user is in range.
 * @param liveUser Live user.
 * @param callback (err, inRange)
 */
Factory.prototype.isUserInRange = function(liveUser, callback) {
    // Make sure the user has a recent position
    if(!liveUser.hasRecentLocation()) {
        callback(null, false);
        return;
    }

    // Create a callback latch
    var latch = new CallbackLatch();

    // Store this instance
    const self = this;

    // Call back only once
    var calledBack = false;

    // Store the factory range and location
    var factoryRange;
    var factoryLocation;

    // Get the range of the factory
    latch.add();
    this.getRange(function(err, range) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Store the range
        factoryRange = range;

        // Resolve the latch
        latch.resolve();
    });

    // Get the factory location
    latch.add();
    this.getFactoryModel().getLocation(function(err, location) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Store the factory location
        factoryLocation = location;

        // Resolve the latch
        latch.resolve();
    });

    // Call back when we're done
    latch.then(() => callback(null, factoryLocation.isInRange(liveUser.getLocation(), factoryRange)));
};

/**
 * Invoke a tick for this factory.
 *
 * @param {Factory~tickCallback} callback Called on success or when an error occurred.
 */
Factory.prototype.tick = function(callback) {
    // Create a callback latch
    var latch = new CallbackLatch();

    // Only call back once
    var calledBack = false;

    // Store this instance
    const self = this;

    // Create a variable for the production and value in/out
    var productionIn,
        productionOut,
        valueIn,
        valueOut;

    // Get the production in
    latch.add();
    this.getProductionIn(function(err, result) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the production in
        productionIn = result;

        // Resolve the latch
        latch.resolve();
    });

    // Get the production out
    latch.add();
    this.getProductionOut(function(err, result) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the production out
        productionOut = result;

        // Resolve the latch
        latch.resolve();
    });

    // Get the value in
    latch.add();
    this.getFactoryModel().getIn(function(err, result) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the value in
        valueIn = result;

        // Resolve the latch
        latch.resolve();
    });

    // Get the value out
    latch.add();
    this.getFactoryModel().getOut(function(err, result) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the value out
        valueOut = result;

        // Resolve the latch
        latch.resolve();
    });

    // Continue
    latch.then(function() {
        // Make sure we've enough in
        if(valueIn < productionIn) {
            callback(null);
            return;
        }

        // Reset the latch to it's identity
        latch.identity();

        // Update the in and out values
        latch.add();
        self.getFactoryModel().setIn(valueIn - productionIn, function(err) {
            // Make sure we've enough in
            if(valueIn < productionIn) {
                callback(null);
                return;
            }

            // Resolve the latch
            latch.resolve();
        });

        latch.add();
        self.getFactoryModel().setOut(valueOut + productionOut, function(err) {
            // Make sure we've enough in
            if(valueIn < productionIn) {
                callback(null);
                return;
            }

            // Resolve the latch
            latch.resolve();
        });

        // Broadcast the location data when we're done, an call back
        latch.then(self.broadcastData(undefined, undefined, callback));
    });
};

/**
 * Called on success or when an error occurred.
 *
 * @callback Factory~tickCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 */

/**
 * Get the range of the factory.
 *
 * @param {Factory~getRangeCallback} callback Called back with the range or when an error occurred.
 */
Factory.prototype.getRange = function(callback) {
    // Check whether we've cached the location
    if(this._range != null) {
        callback(null, this._range);
        return;
    }

    // Store this instance
    const self = this;

    // Get the game config
    this.getGame().getConfig(function(err, gameConfig) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Store the range
        self._range = gameConfig.factory.range;

        // Call back the result
        callback(null, self._range);
    });
};

/**
 * Called back with the range or when an error occurred.
 *
 * @callback Factory~getRangeCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 * @param {Number=} Factory range in meters.
 */

// Export the class
module.exports = Factory;

