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
var mongo = require('mongodb');
var ObjectId = mongo.ObjectId;

var Core = require('../../../Core');
var UserModel = require('../../model/user/UserModel');
var GameTeamModel = require('../../model/gameteam/GameTeamModel');
var CallbackLatch = require('../../util/CallbackLatch');
var Shop = require('./Shop');
var PacketType = require('../../realtime/PacketType');

/**
 * ShopManager class.
 *
 * @param {Game} game The game this shop manager is for.
 *
 * @class
 * @constructor
 */
var ShopManager = function(game) {
    /**
     * Live game instance.
     * @type {Game}
     */
    this.game = game;

    /**
     * List containing all loaded shops.
     *
     * @type {Array} Array of users.
     */
    this.shops = [];

    /**
     * Worker interval handle.
     * @type {Number}
     * @private
     */
    this._worker = null;

    /**
     * Array containing all schedules shops.
     * @type {Array}
     * @private
     */
    this._scheduledShops = [];
};

/**
 * Get the shop for the given shop token.
 *
 * @param {string} token Token of the shop.
 * @param {ShopManager~getShopCallback} callback Called back with the user or when an error occurred.
 */
ShopManager.prototype.getShop = function(token, callback) {
    // Keep track of the found shop
    var result = null;

    // Loop through the list of shops
    this.shops.forEach(function(entry) {
        // Skip if we already found a shop
        if(result !== null)
            return;

        // Check whether the token equals
        if(entry.isToken(token))
            result = entry;
    });

    // Return the result
    return result;
};

/**
 * Called back with the shop or when an error occurred.
 *
 * @callback ShopController~getShopCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Shop|null=} Shop instance or null if no shop was found for this token.
 */

/**
 * Get the shop by a user.
 *
 * @param {User} liveUser Live user.
 * @param {ShopManager~getShopByUserCallback} callback Called back with the user or when an error occurred.
 */
ShopManager.prototype.getShopByUser = function(liveUser, callback) {
    // Make sure a live user was given
    if(liveUser === null)
        return null;

    // Keep track of the found shop
    var result = null;

    // Loop through the list of shops
    this.shops.forEach(function(entry) {
        // Skip if we already found a shop
        if(result !== null)
            return;

        // Check whether the token equals
        if(entry.getUser().getId().equals(liveUser.getId()))
            result = entry;
    });

    // Return the result
    return result;
};

/**
 * Called back with the shop or when an error occurred.
 *
 * @callback ShopController~getShopByUserCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Shop|null=} Shop instance or null if no shop was found for this user.
 */

/**
 * Get the number of active shops.
 *
 * @returns {Number} Number of active shops.
 */
ShopManager.prototype.getShopCount = function() {
    return this.shops.length;
};

/**
 * Load the shop manager, and it's shops.
 *
 * @param {ShopManager~loadCallback} [callback] Callback called when done loading.
 */
ShopManager.prototype.load = function(callback) {
    // Store this instance
    const self = this;

    // Get the game configuration
    this.game.getConfig(function(err, gameConfig) {
        if(err !== null) {
            callback(err);
            return;
        }

        // Get the worker interval
        const workerInterval = gameConfig.shop.workerInterval;

        // Stop any old worker
        if(self._worker !== null)
            clearInterval(self._worker);

        // Start a worker
        self._worker = setInterval(function() {
            self.worker();
        }, workerInterval);

        // Call the worker immediately
        self.worker();

        // Call back
        callback(null);
    });
};

/**
 * @callback ShopManager~loadCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 */

/**
 * Unload all loaded shops.
 */
ShopManager.prototype.unload = function() {
    // Stop the shop worker
    if(this._worker !== null) {
        clearInterval(this._worker);
        this._worker = null;
    }

    // Loop through the list of shops
    this.shops.forEach(function(user) {
        // Unload the user
        user.unload();
    });
};

/**
 * Shop worker function.
 * Will be called once in a while to manage the shops.
 */
ShopManager.prototype.worker = function() {
    // Create an object with the preferred shop delta count for each team
    var prefShopCountDelta = {};

    // Store this
    const self = this;

    // Callback latch
    var latch = new CallbackLatch();

    // Loop through the list of users
    this.game.userManager.users.forEach(function(liveUser) {
        // Get the game user
        latch.add();
        liveUser.getGameUser(function(err, gameUser) {
            // Handle errors
            if(err !== null) {
                console.error(err);
                console.error('Failed to get game user instance');
                return;
            }

            // Continue if we can't find a game user for this user
            if(gameUser === null) {
                latch.resolve();
                return;
            }

            // Get the users team
            gameUser.getTeam(function(err, userTeam) {
                // Handle errors
                if(err !== null) {
                    console.error(err);
                    console.error('Failed to get game configuration, ignoring');
                    return;
                }

                // Skip if the team is null
                if(userTeam === null) {
                    latch.resolve();
                    return;
                }

                // Get the user's team ID
                const userTeamId = userTeam.getIdHex();

                // Continue if this team is already in the delta object
                if(prefShopCountDelta.hasOwnProperty(userTeamId)) {
                    latch.resolve();
                    return;
                }

                // Get the preferred shop count delta for this team
                self.getTeamPreferredShopCountDelta(userTeamId, function(err, delta) {
                    // Handle errors
                    if(err !== null) {
                        console.error(err);
                        console.error('Failed to calculate preferred shop count delta for a team');
                        return;
                    }

                    // Add an entry to the object with the delta
                    prefShopCountDelta[userTeamId] = delta;

                    // Resolve the latch
                    latch.resolve();
                });
            });
        });
    });

    // Continue
    latch.then(function() {
        // Get the game configuration
        self.game.getConfig(function(err, gameConfig) {
            // Handle errors
            if(err !== null) {
                console.error(err);
                console.error('Failed to get game configuration');
                return;
            }

            // Loop through the map
            for(var teamId in prefShopCountDelta) {
                // Make sure this team ID is part of the counter object
                if(!prefShopCountDelta.hasOwnProperty(teamId))
                    continue;

                // Get the delta count for the shops for ths team
                const shopDeltaCount = prefShopCountDelta[teamId];

                // Continue if the delta count is zero or below
                if(shopDeltaCount <= 0)
                    continue;

                // Find as much new shop users as we need
                for(var i = 0; i < shopDeltaCount; i++)
                    self.findNewShopUser(teamId, function(err, newUser) {
                        // Handle errors
                        if(err !== null) {
                            console.error(err);
                            console.error('Failed to find new shop user');
                            return;
                        }

                        // Make sure a new user was found
                        if(newUser === null)
                            return;

                        // Schedule the user
                        self.scheduleUser(newUser);
                    });
            }
        });
    });
};

/**
 * Live user to schedule to become a shop.
 * @param {User} liveUser Live user to schedule.
 */
ShopManager.prototype.scheduleUser = function(liveUser) {
    // Store this
    const self = this;

    // Store the live game instance
    const liveGame = this.game;

    // Get the game configuration
    liveGame.getConfig(function(err, gameConfig) {
        // Handle errors
        if(err !== null) {
            console.error(err);
            console.error('An error occurred while getting game config');
            return;
        }

        // Get the alert time for a scheduled user
        const alertTime = gameConfig.shop.shopAlertTime;

        // Create a new shop instance
        var shop = new Shop(liveUser, self);

        // Add the shop to the scheduled users list
        self._scheduledShops.push(shop);

        // Send a notification to the user
        Core.realTime.packetProcessor.sendPacketUser(PacketType.MESSAGE_RESPONSE, {
            message: 'You\'re getting increasingly interested in the salesman job for special goods.<br><br>' +
            'You might become a special kind of merchant soon...',
            error: false,
            toast: false,
            dialog: true
        }, liveUser.getUserModel());

        // Create a timer
        setTimeout(function() {
            // Make sure the shop is still in the array
            if(self._scheduledShops.indexOf(shop) < 0) {
                console.warn('Scheduled shop not instantiating, it was removed from the scheduled list');
                return;
            }

            // Remove the shop from the list
            self._scheduledShops.splice(self._scheduledShops.indexOf(shop), 1);

            // Add the shop to the list of shops
            self.shops.push(shop);

            // Send a notification to the user
            Core.realTime.packetProcessor.sendPacketUser(PacketType.MESSAGE_RESPONSE, {
                message: 'You became a ' + liveGame.__('shop.name') + '.<br><br>' +
                'You and other players are now able to buy/sell goods when they\'re nearby you.<br><br>' +
                'Watch out: you\'re now visible on the map for everyone, also for enemy players.',
                error: false,
                toast: false,
                dialog: true
            }, liveUser.getUserModel());

            // Load the shop
            shop.load(function(err) {
                // Handle errors
                if(err !== null) {
                    console.error(err);
                    console.error('An error occurred while loading a shop, ignoring...');
                }
            });

            // Update the game data for everyone
            Core.gameManager.sendGameDataToAll(self.game.getGameModel(), function(err) {
                // Handle errors
                if(err !== null) {
                    console.error(err);
                    console.error('An error occurred while sending game data to all users');
                }
            });

        }, alertTime);
    });
};

/**
 * Get the shop count for the given team ID.
 * This includes scheduled shops, that aren't available on the map yet.
 *
 * @param {ObjectId} teamId Team ID
 * @param {ShopManager~getTeamShopCount} callback Called with the team's shop count or when an error occurred.
 */
ShopManager.prototype.getTeamShopCount = function(teamId, callback) {
    // Create a counter
    var count = 0;

    // Only call back once
    var calledBack = false;

    // Create a callback latch
    var latch = new CallbackLatch();

    // Create an array processing function
    const processingFunction = function(liveShop) {
        // Get the shop's team
        latch.add();
        liveShop.getTeam(function(err, team) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Continue if the team is null
            if(team === null)
                return;

            // Check whether the teams equal
            if(team.getId().equals(teamId))
                count++;

            // Resolve the latch
            latch.resolve();
        });
    };

    // Loop through the list of shops
    this.shops.forEach(processingFunction);

    // Loop through the list of scheduled shops
    this._scheduledShops.forEach(processingFunction);

    // Call back the count when we're done with the latch
    latch.then(function() {
        // Call back
        callback(null, count);
    });
};

/**
 * Called with the team's shop count or when an error occurred.
 *
 * @callback ShopManager~getTeamShopCount
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Number=} Number of shops for the given team.
 */

/**
 * Check whether the given user is a shop user, or is scheduled to become a shop.
 *
 * @param {User} user User to check for.
 */
ShopManager.prototype.isShopUser = function(user) {
    // Determine whether we found the user
    var found = false;

    // Create an array processing function
    const processingFunction = function(liveShop) {
        // Skip if we already found
        if(found)
            return;

        // Check whether we found the correct user
        if(liveShop.getUser().getId().equals(user.getId()))
            found = true;
    };

    // Loop through the list of shops
    this.shops.forEach(processingFunction);

    // Return true if we found something
    if(found)
        return true;

    // Loop through the list of scheduled shops
    this._scheduledShops.forEach(processingFunction);

    // Return the result
    return found;
};

/**
 * Find a new user for the given team that can become a shop.
 *
 * @param {string} teamId Team ID to find a user for.
 * @param {function} callback (err, user|null)
 */
ShopManager.prototype.findNewShopUser = function(teamId, callback) {
    // Get the users
    this.findNewShopUsers(teamId, function(err, users) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Make sure we've any user
        if(users.length === 0) {
            callback(null, null);
            return;
        }

        // Pick a random user, and call it back
        callback(null, users[Math.floor(Math.random() * users.length)]);
    });
};

/**
 * Find new users for the given team that can become a shop.
 *
 * @param {string} teamId Team ID to find users for.
 * @param {function} callback (err, users)
 */
ShopManager.prototype.findNewShopUsers = function(teamId, callback) {
    // Create a list of users
    var users = [];

    // Store this instance
    const self = this;

    // Callback latch
    var latch = new CallbackLatch();

    // Make sure we only call back once
    var calledBack = false;

    // Loop through the list of users
    this.game.userManager.users.forEach(function(liveUser) {
        // Get the game user
        latch.add();
        Core.model.gameUserModelManager.getGameUser(liveUser.getGame().getGameModel(), liveUser.getUserModel(), function(err, gameUser) {
            // Handle errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Continue if the game user is null
            if(gameUser === null) {
                latch.resolve();
                return;
            }

            // Get the user's team
            gameUser.getTeam(function(err, userTeam) {
                // Handle errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Make sure the team is valid
                if(userTeam === null) {
                    latch.resolve();
                    return;
                }

                // Get the team ID make sure it's equal
                if(!userTeam.getId().equals(teamId)) {
                    latch.resolve();
                    return;
                }

                // Make sure this user isn't a shop already
                if(self.isShopUser(liveUser)) {
                    latch.resolve();
                    return;
                }

                // Make sure the user has a recent location
                if(!liveUser.hasRecentLocation()) {
                    latch.resolve();
                    return;
                }

                // The user seems fine, add him to the list
                users.push(liveUser);

                // Resolve the latch
                latch.resolve();
            });
        });
    });

    // Call back the list of users when we're done
    latch.then(function() {
        callback(null, users);
    });
};

/**
 * Get the preferred shop count delta for the given team.
 * If it's preferred a team get's less shops for their current user count, a negative user count is returned.
 *
 * @param {GameTeamModel|ObjectId|string} teamId Team instance or ID to get the delta count for.
 * @param {ShopManager~getTeamPreferredShopCountDeltaCallback} callback Called with the result or when an error occurred.
 */
ShopManager.prototype.getTeamPreferredShopCountDelta = function(teamId, callback) {
    // Get the object ID of the team
    if(teamId instanceof GameTeamModel)
        teamId = teamId.getId();
    else if(_.isString(teamId) && ObjectId.isValid(teamId))
        teamId = new ObjectId(teamId);
    else if(!(teamId instanceof ObjectId)) {
        // Call back with zero
        callback(null, 0);
        return;
    }

    // Count the number of users
    var userCount = 0;

    // Store this
    const self = this;

    // Callback latch
    var latch = new CallbackLatch();

    // Loop through the list of users
    this.game.userManager.users.forEach(function(liveUser) {
        // Make sure the user has a recent location
        if(!liveUser.hasRecentLocation())
            return;

        // Get the game user
        latch.add();
        Core.model.gameUserModelManager.getGameUser(liveUser.getGame().getGameModel(), liveUser.getUserModel(), function(err, gameUser) {
            // Handle errors
            if(err !== null) {
                callback(err);
                return;
            }

            // Continue if we can't find a game user for this user
            if(gameUser === null) {
                latch.resolve();
                return;
            }

            // Get the users team
            gameUser.getTeam(function(err, userTeam) {
                // Handle errors
                if(err !== null) {
                    callback(err);
                    return;
                }

                // Skip if the team is null or if the team doesn't equal the specified team
                if(userTeam === null || !userTeam.getId().equals(teamId)) {
                    latch.resolve();
                    return;
                }

                // Increase the user count for the team
                userCount++;

                // Resolve the latch
                latch.resolve();
            });
        });
    });

    // Continue
    latch.then(function() {
        // Get the game configuration
        self.game.getConfig(function(err, gameConfig) {
            // Handle errors
            if(err !== null) {
                callback(err);
                return;
            }

            // Get the preferred shop count for this team
            const preferredShopCount = gameConfig.shop.getShopsInTeam(userCount);

            // Get the number of shops
            self.getTeamShopCount(teamId, function(err, currentCount) {
                // Handle errors
                if(err !== null) {
                    callback(err);
                    return;
                }

                // Determine the shop count delta and call it back
                callback(null, preferredShopCount - currentCount);
            });
        });
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback ShopManager~getTeamPreferredShopCountDeltaCallback
 * @param {Error|null} Error instance if an error occurred.
 * @param {Number=} Preferred shop count delta.
 */

// Export the class
module.exports = ShopManager;

