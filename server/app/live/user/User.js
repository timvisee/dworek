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
     * User model instance if available.
     * @type {UserModel|null} User model instance or null if no instance is currently available.
     */
    this._model = null;

    /**
     * Live game instance.
     * @type {Game} Game.
     * @private
     */
    this._game = game;

    /**
     * Team model of this user, if the user is in any team.
     *
     * @type {TeamModel|null} Team model if the user is in a team, or null if the user isn't in a team.
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

    // Store the user model instance if any was given
    if(user instanceof UserModel)
        this._model = user;
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
    // Return the model if it isn't null
    if(this._model !== null)
        return this._model;

    // Create a user model for the known ID, store and return it
    return this._model = Core.model.userModelManager._instanceManager.create(this._id);
};

/**
 * Get the team model for this user if the user is in any team.
 *
 * @return {TeamModel|null} Team model or null.
 */
User.prototype.getTeamModel = function() {
    return this._teamModel;
};

/**
 * Check whether this user has a team.
 *
 * @return {boolean} True if the user has a team, false if not.
 */
User.prototype.hasTeam = function() {
    return this._teamModel != null;
};

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
            this._teamModel = result;

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
 * @param {Coordinate} location New location.
 * @param socket Source socket.
 * @param {function} callback callback(err) Called on success or on error.
 */
User.prototype.updateLocation = function(location, socket, callback) {
    // Store this instance
    const self = this;

    // Set the location
    this.setLocation(location);

    // Get the live game
    const liveGame = this.getGame();

    // Define whether to update the game data
    var updateGameData = false;

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
        liveFactory.updateVisibilityMemory(self, function(err, changed) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Check whether we should update the game data
            if(changed)
                updateGameData = true;

            // Resolve the latch
            latch.resolve();
        });
    });

    // Continue when we're done
    latch.then(function() {
        // Update the game data
        if(updateGameData)
            Core.gameController.sendGameData(liveGame.getGameModel(), self.getUserModel(), undefined, function(err) {
                // Call back errors
                if(err !== null) {
                    callback(err);
                    return;
                }

                // Call back normally
                callback(null);
            });
    });
};

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
 * Check whether this user is visible for the given user.
 *
 * @param {User} other Given user.
 * @param {function} callback callback(err, isVisible)
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

        // Check whether the users are in the same team
        const sameTeam = self.hasTeam() && other.hasTeam() && self.getTeamModel().getId().equals(other.getTeamModel().getId());

        // Call back
        if(!calledBack)
            callback(null, sameTeam);
        calledBack = true;
    });
};

// Export the class
module.exports = User;

