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

var config = require('../../../config');

var Core = require('../../../Core');
var UserModel = require('../../model/user/UserModel');
var CallbackLatch = require('../../util/CallbackLatch');

/**
 * User class.
 *
 * @param {UserModel|ObjectId|string} user User model instance or the ID of a user.
 * @param {Game} game Game instance.
 *
 * @class
 * @constructor
 */
var User = function(user, game) {
    /**
     * ID of the user this object corresponds to.
     * @type {ObjectId}
     */
    this._id = null;

    /**
     * Live game instance.
     *
     * @type {Game} Game.
     * @private
     */
    this._game = game;

    /**
     * Team model of this user, if the user is in any team.
     *
     * @type {GameTeamModel|null} Team model if the user is in a team, or null if the user isn't in a team.
     * @private
     */
    this._teamModel = null;

    /**
     * Last known location of the user.
     *
     * @type {null}
     * @private
     */
    this._location = null;

    /**
     * Last time the location updated at.
     *
     * @type {Date|null}
     * @private
     */
    this._locationTime = null;

    // Get and set the user ID
    if(user instanceof UserModel)
        this._id = user.getId();
    else if(!(user instanceof ObjectId) && ObjectId.isValid(user))
        this._id = new ObjectId(user);
    else if(!(user instanceof ObjectId))
        throw new Error('Invalid user instance or ID');
    else
        this._id = user;
};

/**
 * Get the user ID for this user.
 *
 * @return {ObjectId} User ID.
 */
User.prototype.getId = function() {
    return this._id;
};

/**
 * Get the hexadecimal ID representation of the user.
 *
 * @returns {string} User ID as hexadecimal string.
 */
User.prototype.getIdHex = function() {
    return this.getId().toString();
};

/**
 * Check whether the give user instance or ID equals this user.
 *
 * @param {UserModel|ObjectId|string} user User instance or the user ID.
 * @return {boolean} True if this user equals the given user instance.
 */
User.prototype.isUser = function(user) {
    // Get the user ID as an ObjectId
    if(user instanceof UserModel)
        user = user.getId();
    else if(!(user instanceof ObjectId) && ObjectId.isValid(user))
        user = new ObjectId(user);
    else if(!(user instanceof ObjectId))
        throw Error('Invalid user ID');

    // Compare the user ID
    return this._id.equals(user);
};

/**
 * Get the user model.
 *
 * @return {UserModel} User model instance.
 */
User.prototype.getUserModel = function() {
    return Core.model.userModelManager._instanceManager.create(this._id);
};

/**
 * Get the game user model instance for this live user.
 *
 * @param {User~getGameUserCallback} callback Called with the game user or when an error occurred.
 */
User.prototype.getGameUser = function(callback) {
    // Get the game user
    Core.model.gameUserModelManager.getGameUser(this.getGame().getGameModel(), this.getUserModel(), callback);
};

/**
 * Called with the game user or when an error occurred.
 *
 * @callback User~getGameUserCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {GameUserModel|null=} Game user model instance for this user, or null if it couldn't be found.
 */

/**
 * Get the user's team if the user has any.
 *
 * @param {User~getTeamCallback} callback Called with the team or when an error occurred.
 */
User.prototype.getTeam = function(callback) {
    // Get the game user for this user
    this.getGameUser(function(err, gameUser) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Make sure the user isn't null
        if(gameUser == null) {
            callback(null, null);
            return;
        }

        // Get the user's team
        gameUser.getTeam(callback);
    });
};

/**
 * Called with the team or when an error occurred.
 *
 * @callback User~getTeamCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {GameTeamModel|null=} User's team or null if the user doesn't have a team.
 */

/**
 * Check whether the user has a team.
 * The User#getTeam() function should be called instead if it's also preferred to use the team model instance for
 * performance reasons.
 *
 * @param {User~hasTeamCallback} callback Called with the result or when an error occurred.
 */
User.prototype.hasTeam = function(callback) {
    // Get the user's team
    this.getTeam(function(err, team) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Check whether the user has a team, call back the result
        callback(null, team != null);
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback User~hasTeamCallback
 * @param {Error|null} Error instance if an error occurred.
 * @param {boolean=} True if this user has a team, false if not.
 */

/**
 * Check whether this player is in the given team.
 * Null is also called back if the team of the current player is unknown and/or if the given team is null.
 *
 * @param {GameTeamModel} otherTeam Other team.
 * @param {User~isTeamCallback} callback Called back with the result or when an error occurred.
 */
User.prototype.isTeam = function(otherTeam, callback) {
    // Call back if the other team is null
    if(otherTeam == null) {
        callback(null, false);
        return;
    }

    // Get the team of the current user
    this.getTeam(function(err, team) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Call back false if the team is unknown
        if(team == null) {
            callback(null, false);
            return;
        }

        // Compare the teams and return the result
        callback(null, team.getId().equals(otherTeam.getId()));
    });
};

/**
 * Called back with the result or when an error occurred.
 *
 * @callback User~isTeamCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean=} True if the teams are the same, false if not.
 */

/**
 * Get the user name.
 *
 * @param {User~getNameCallback} callback Callback with the result.
 */
User.prototype.getName = function(callback) {
    this.getUserModel().getDisplayName(callback);
};

/**
 * @callback User~getNameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {string=} User name.
 */

/**
 * Get the live game instance.
 * @return {Game} Game.
 */
User.prototype.getGame = function() {
    return this._game;
};

/**
 * Unload this live user instance.
 *
 * @param {User~loadCallback} callback Called on success or when an error occurred.
 */
User.prototype.load = function(callback) {
    // Get the user model and game
    const userModel = this.getUserModel();
    const gameModel = this.getGame().getGameModel();

    // Store this instance
    const self = this;

    // Get the user state
    Core.model.gameUserModelManager.getGameUser(gameModel, userModel, function(err, gameUser) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Get the game team
        gameUser.getTeam(function(err, result) {
            // Call back errors
            if(err !== null) {
                callback(err);
                return;
            }

            // Get the team
            self._teamModel = result;

            // Call back
            callback(null);
        });
    });
};

/**
 * Called on success or when an error occurred.
 *
 * @callback User~loadCallback
 * @param {Error|null} Error instance if an error occurred, null on success.kk
 */

/**
 * Unload this live user instance.
 */
User.prototype.unload = function() {};

/**
 * Get the strength of the user.
 *
 * @param {User~getStrengthCallback} callback Called back with the strength or when an error occurred.
 */
User.prototype.getStrength = function(callback) {
    // Get the game user
    this.getGameUser(function(err, gameUser) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Make sure a game user is known
        if(gameUser == null) {
            callback(null, 0);
            return;
        }

        // Get the user's strength
        gameUser.getStrength(callback);
    });
};

/**
 * Called back with the strength or when an error occurred.
 *
 * @callback User~getStrengthCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Number=} Strength value for this user.
 */

/**
 * Set the location.
 *
 * @param location New location.
 */
User.prototype.setLocation = function(location) {
    // Set the location and it's update time
    this._location = location;
    this._locationTime = new Date();
};

/**
 * Get the last known player location.
 *
 * @return {Coordinate|null} Null is returned if this player doesn't have a known location.
 */
User.prototype.getLocation = function() {
    return this._location;
};

/**
 * Get the age in milliseconds of the last location update.
 *
 * @return {Number|null} Location age in milliseconds, or null if no location is available yet.
 */
User.prototype.getLocationAge = function() {
    // Make sure a location time is set
    if(this._locationTime == null)
        return null;

    // Calculate and return the age
    return Date.now() - this._locationTime.getTime();
};

/**
 * Get the recent/last known player location.
 * Null will be returned if the location hasn't been updated and/or is decayed.
 *
 * @return {Coordinate|null} Location or null.
 */
User.prototype.getRecentLocation = function() {
    // Get the location age, and make sure it's valid
    const locationAge = this.getLocationAge();
    if(locationAge === null)
        return null;

    // Get the decay time
    const decayTime = config.game.locationDecayTime;

    // Return the location if it hasn't been decayed yet
    return (locationAge < decayTime) ? this._location : null;
};

/**
 * Check whether the user has a recently known location.
 *
 * @return {boolean} True if a recent location is known, false if not.
 */
User.prototype.hasRecentLocation = function() {
    return this.getRecentLocation() !== null;
};

/**
 * Check whether we know the last location of the user.
 *
 * @return {boolean} True if the last location is known.
 */
User.prototype.hasLocation = function() {
    return this.getLocation() !== null;
};

/**
 * Update the location.
 *
 * @param {Coordinate|undefined} [location] New location or undefined to not update his current location.
 * @param [socket] Source socket or undefined.
 * @param {User~updateLocationCallback} callback Called on success or when an error occurred.
 */
User.prototype.updateLocation = function(location, socket, callback) {
    // Store this instance
    const self = this;

    // Set the location
    if(location != undefined)
        this.setLocation(location);

    // Get the live game
    const liveGame = this.getGame();

    // Define whether to update the game data
    var updateUser = false;

    // Make sure we only call back once
    var calledBack = false;

    // Create a callback latch
    var latch = new CallbackLatch();

    // Loop through all the factories
    liveGame.factoryManager.factories.forEach(function(liveFactory) {
        // Skip if we called back
        if(calledBack)
            return;

        // Update the visibility state for the user
        latch.add();
        liveFactory.updateVisibilityState(self, function(err, changed) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Check whether we should update the game data
            if(changed)
                updateUser = true;

            // Resolve the latch
            latch.resolve();
        });
    });

    // Loop through all the shops
    liveGame.shopManager.shops.forEach(function(liveShop) {
        // Skip if we called back
        if(calledBack)
            return;

        // Update the visibility state for the user
        latch.add();
        liveShop.updateVisibilityState(self, function(err, changed) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Check whether we should update the game data
            if(changed)
                updateUser = true;

            // Resolve the latch
            latch.resolve();
        });
    });

    // Continue when we're done
    latch.then(function() {
        // Reset the callback latch to it's identity
        latch.identity();

        // Check whether to update the user
        if(updateUser) {
            // Update the game data
            latch.add();
            Core.gameController.sendGameData(liveGame.getGameModel(), self.getUserModel(), undefined, function(err) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Resolve the latch
                latch.resolve();
            });

            // Update the user's location data
            latch.add();
            Core.gameController.broadcastLocationData(self.getGame(), self, socket, function(err) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Resolve the latch
                latch.resolve();
            });

            // Call back when we're done
            latch.then(() => callback(null));
        }
    });
};

/**
 * Called on success or when an error occurred.
 *
 * @callback User~updateLocationCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Get the user's money.
 *
 * @param {User~getMoneyCallback} callback Called with the result or when an error occurred.
 */
User.prototype.getMoney = function(callback) {
    // Get the game user
    Core.model.gameUserModelManager.getGameUser(this.getGame().getGameModel(), this.getUserModel(), function(err, gameUser) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Make sure the game user is valid
        if(gameUser == null) {
            callback(null, null);
            return;
        }

        // Get the money
        gameUser.getMoney(callback);
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback User~getMoneyCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Number} Amount of money.
 */

/**
 * Set the user's money.
 *
 * @param {Number} money Money.
 * @param {User~setMoneyCallback} callback Called on success or when an error occurred.
 */
User.prototype.setMoney = function(money, callback) {
    // Get the game user
    Core.model.gameUserModelManager.getGameUser(this.getGame().getGameModel(), this.getUserModel(), function(err, gameUser) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Make sure the game user is valid
        if(gameUser == null) {
            callback(null, null);
            return;
        }

        // Get the money
        gameUser.setMoney(money, callback);
    });
};

/**
 * Called on success or when an error occurred.
 *
 * @callback User~setMoneyCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Add money to a user.
 *
 * @param {Number} amount Amount of money to add.
 * @param {User~addMoneyCallback} callback Called on success or when an error occurred.
 */
User.prototype.addMoney = function(amount, callback) {
    // Get the game user
    Core.model.gameUserModelManager.getGameUser(this.getGame().getGameModel(), this.getUserModel(), function(err, gameUser) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Make sure the game user is valid
        if(gameUser == null) {
            callback(null, null);
            return;
        }

        // Get the money
        gameUser.addMoney(amount, callback);
    });
};

/**
 * Called on success or when an error occurred.
 *
 * @callback User~addMoneyCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 */

/**
 * Subtract money from a user.
 *
 * @param {Number} amount Amount of money to subtract.
 * @param {User~subtractMoney} callback Called on success or when an error occurred.
 */
User.prototype.subtractMoney = function(amount, callback) {
    // Get the game user
    Core.model.gameUserModelManager.getGameUser(this.getGame().getGameModel(), this.getUserModel(), function(err, gameUser) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Make sure the game user is valid
        if(gameUser == null) {
            callback(null, null);
            return;
        }

        // Get the money
        gameUser.subtractMoney(amount, callback);
    });
};

/**
 * Called on success or when an error occurred.
 *
 * @callback User~subtractMoney
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 */

/**
 * Get the user's in.
 *
 * @param {User~getInCallback} callback Called with the result or when an error occurred.
 */
User.prototype.getIn = function(callback) {
    // Get the game user
    Core.model.gameUserModelManager.getGameUser(this.getGame().getGameModel(), this.getUserModel(), function(err, gameUser) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Make sure the game user is valid
        if(gameUser == null) {
            callback(null, null);
            return;
        }

        // Get the goods
        gameUser.getIn(callback);
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback User~getInCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Number} Amount of in.
 */

/**
 * Set the user's in value.
 *
 * @param {Number} goods Number of in.
 * @param {User~setInCallback} callback Called on success or when an error occurred.
 */
User.prototype.setIn = function(goods, callback) {
    // Get the game user
    Core.model.gameUserModelManager.getGameUser(this.getGame().getGameModel(), this.getUserModel(), function(err, gameUser) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Make sure the game user is valid
        if(gameUser == null) {
            callback(null, null);
            return;
        }

        // Get the goods
        gameUser.setIn(goods, callback);
    });
};

/**
 * Called on success or when an error occurred.
 *
 * @callback User~setInCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 */

/**
 * Get the user's out.
 *
 * @param {User~getOutCallback} callback Called with the result or when an error occurred.
 */
User.prototype.getOut = function(callback) {
    // Get the game user
    Core.model.gameUserModelManager.getGameUser(this.getGame().getGameModel(), this.getUserModel(), function(err, gameUser) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Make sure the game user is valid
        if(gameUser == null) {
            callback(null, null);
            return;
        }

        // Get the goods
        gameUser.getOut(callback);
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback User~getOutCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Number} Amount of out.
 */

/**
 * Set the user's out value.
 *
 * @param {Number} goods Number of out.
 * @param {User~setOutCallback} callback Called on success or when an error occurred.
 */
User.prototype.setOut = function(goods, callback) {
    // Get the game user
    Core.model.gameUserModelManager.getGameUser(this.getGame().getGameModel(), this.getUserModel(), function(err, gameUser) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Make sure the game user is valid
        if(gameUser == null) {
            callback(null, null);
            return;
        }

        // Get the goods
        gameUser.setOut(goods, callback);
    });
};

/**
 * Called on success or when an error occurred.
 *
 * @callback User~setOutCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 */

/**
 * Check whether this user is visible for the given user.
 *
 * @param {User} other Given user.
 * @param {User~isVisibleForCallback} callback callback(err, isVisible)
 */
User.prototype.isVisibleFor = function(other, callback) {
    // Make sure a valid user is given
    if(other == null) {
        callback(null, false);
        return;
    }

    // Make sure it's not this user
    if(this.isUser(other.getId())) {
        callback(null, false);
        return;
    }

    // Make sure any location is known
    if(!this.hasLocation()) {
        callback(null, false);
        return;
    }

    // Get the user model
    const userModel = this.getUserModel();

    // Get the live game and game model
    const liveGame = this.getGame();
    const gameModel = liveGame.getGameModel();

    // Make sure the game model is valid
    if(gameModel == null) {
        callback(null, false);
        return;
    }

    // Determine whether we've called back
    var calledBack = false;

    // Store this instance
    const self = this;

    // Get the roles
    userModel.getGameState(gameModel, function(err, roles) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Return if the user isn't a spectator or player
        if(!roles.player && !roles.spectator) {
            if(!calledBack)
                callback(null, false);
            calledBack = true;
            return;
        }

        // Return true if the user is a spectator
        if(roles.spectator) {
            if(!calledBack)
                callback(null, true);
            calledBack = true;
            return;
        }

        // Check whether this user is a shop
        if(self.getGame().shopManager.isShopUser(self)) {
            callback(null, true);
            return;
        }

        // Make sure this user has a recent location
        if(!self.hasRecentLocation()) {
            callback(null, false);
            return;
        }

        // Create a team latch
        var teamLatch = new CallbackLatch();

        // Create two variables for the user and other user's team
        var team = null;
        var otherTeam = null;

        // Get the user's team
        teamLatch.add();
        self.getTeam(function(err, result) {
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

            // Set the team
            team = result;

            // Resolve the team latch
            teamLatch.resolve();
        });

        // Get the other user's team
        teamLatch.add();
        other.getTeam(function(err, result) {
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

            // Set the other team
            otherTeam = result;

            // Resolve the team latch
            teamLatch.resolve();
        });

        // Check whether the user team's are the same when we fetched both teams
        teamLatch.then(function() {
            // Determine whether the teams are the same and call back
            if(!calledBack)
                callback(null, team.getId().equals(otherTeam.getId()));
            calledBack = true;
        });
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback User~isVisibleForCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean=} True if the user is visible, false if not.
 */

/**
 * Get the user's balance table as HTML.
 * This results in a table showing the user's current money, in and out balance.
 *
 * @param {Object|null} options Object with options, or null to skip any options.
 * @param {Number} [options.previousMoney] Previous amount of money to show in brackets.
 * @param {Number} [options.previousIn] Previous amount of in to show in brackets.
 * @param {Number} [options.previousOut] Previous amount of out to show in brackets.
 * @param {User~getBalanceTableCallback} callback
 */
User.prototype.getBalanceTable = function (options, callback) {
    // Parse the options
    if(options === null || options === undefined)
        options = {};

    // Create a callback latch
    const latch = new CallbackLatch();

    // Determine whether we called back
    var calledBack = false;

    // Create a variable for the user's money, in and out
    var userMoney;
    var userIn;
    var userOut;

    // Get the user's money
    latch.add();
    this.getMoney(function(err, money) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the user money
        userMoney = money;

        // Resolve the latch
        latch.resolve();
    });

    // Get the user's in
    latch.add();
    this.getIn(function(err, result) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the user's in
        userIn = result;

        // Resolve the latch
        latch.resolve();
    });

    // Get the user's out
    latch.add();
    this.getOut(function(err, out) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the user's out
        userOut = out;

        // Resolve the latch
        latch.resolve();
    });

    // Call back the table when we fetched the required information
    latch.then(function() {
        // Build and call back the table
        if(!calledBack)
            // TODO: Get the money, in and out names from the game's game configuration
            callback(null,
                    '<table>' +
                    '    <tr>' +
                    '        <td><i>Money:</i>&nbsp;&nbsp;</td>' +
                    '        <td>' + userMoney + ' dollars' + (options.hasOwnProperty('previousMoney') ? '<span style="color: gray; font-style: italic;"> (' + options.previousMoney + ')</span>' : '') + '</td>' +
                    '    </tr>' +
                    '    <tr>' +
                    '        <td><i>Ingredients:</i>&nbsp;&nbsp;</td>' +
                    '        <td>' + userIn + ' units' + (options.hasOwnProperty('previousIn') ? '<span style="color: gray; font-style: italic;"> (' + options.previousIn + ')</span>' : '') + '</td>' +
                    '    </tr>' +
                    '    <tr>' +
                    '        <td><i>Drugs:</i>&nbsp;&nbsp;</td>' +
                    '        <td>' + userOut + ' units' + (options.hasOwnProperty('previousOut') ? '<span style="color: gray; font-style: italic;"> (' + options.previousOut + ')</span>' : '') + '</td>' +
                    '    </tr>' +
                    '</table>'
            );
    });
};

/**
 * Called with the user's balance table, or when an error occurred.
 *
 * @callback User~getBalanceTableCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {string=} String with the balance table as HTML.
 */

/**
 * Get the user as a string.
 *
 * @return {String} String representation.
 */
User.prototype.toString = function() {
    return '[User:' + this.getIdHex() + ']';
};

// Export the class
module.exports = User;