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
var User = require('./User');
var UserModel = require('../../model/user/UserModel');
var CallbackLatch = require('../../util/CallbackLatch');

/**
 * UserManager class.
 *
 * @param {Game} game Live game instance.
 *
 * @class
 * @constructor
 */
var UserManager = function(game) {
    /**
     * Live game instance.
     * @type {Game}
     */
    this.game = game;

    /**
     * List containing all loaded users.
     *
     * @type {Array} Array of users.
     */
    this.users = [];
};

/**
 * Get the given user.
 *
 * @param {UserModel|ObjectId|string} userId User instance or the user ID to get the user for.
 * @param {UserManager~getUserCallback} callback Called back with the user or when an error occurred.
 */
UserManager.prototype.getUser = function(userId, callback) {
    // Get the user ID as an ObjectId
    if(userId instanceof UserModel)
        userId = userId.getId();
    else if(!(userId instanceof ObjectId) && ObjectId.isValid(userId))
        userId = new ObjectId(userId);
    else if(!(userId instanceof ObjectId)) {
        callback(new Error('Invalid user ID'));
        return;
    }

    // Get the user if it's already loaded
    const loadedUser = this.getLoadedUser(userId);
    if(loadedUser !== null) {
        callback(null, loadedUser);
        return;
    }

    // Store this instance
    const self = this;

    // Get the user for the given ID
    Core.model.userModelManager.isValidUserId(userId, function(err, valid) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Make sure the user is valid
        if(!valid) {
            callback(null, null);
            return;
        }

        // Make sure the stage of this user is active
        self.game.getGameModel().getStage(function(err, stage) {
            // Call back errors
            if(err !== null) {
                callback(err);
                return;
            }

            // Make sure the stage is valid
            if(stage != 1) {
                callback(null, null);
                return;
            }

            // Create a user instance for this model
            var newUser = new User(userId, this.game);

            // Add the user to the list of loaded users
            self.users.push(newUser);

            // Call back the user
            callback(null, newUser);
        });
    });
};

/**
 * Called back with the user or when an error occurred.
 *
 * @callback UserController~getUserCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {User|null=} User instance, null if the user isn't active or if the user is invalid.
 */

/**
 * Get the loaded user instance for the given user ID.
 * Null will be returned if no user is loaded for the given user ID.
 *
 * @param {UserModel|ObjectId|string} userId User instance or the user ID to get the user for.
 */
UserManager.prototype.getLoadedUser = function(userId) {
    // Get the user ID as an ObjectId
    if(userId instanceof UserModel)
        userId = userId.getId();
    else if(!(userId instanceof ObjectId) && ObjectId.isValid(userId))
        userId = new ObjectId(userId);
    else if(!(userId instanceof ObjectId))
        throw new Error('Invalid user ID');

    // Keep track of the found user
    var result = null;

    // Loop through the list of users
    this.users.forEach(function(entry) {
        // Skip if we already found a user
        if(result != null)
            return;

        // Check whether the user ID equals the user
        if(entry.isUser(userId))
            result = entry;
    });

    // Return the result
    return result;
};

/**
 * Check whether the user for the given user ID is loaded.
 *
 * @param {UserModel|ObjectId|string} userId User instance or the user ID.
 * @return {boolean} True if the user is currently loaded, false if not.
 */
UserManager.prototype.isUserLoaded = function(userId) {
    return this.getLoadedUser(userId) != null;
};

/**
 * Get the number of loaded users.
 *
 * @returns {Number} Number of loaded users.
 */
UserManager.prototype.getLoadedUserCount = function() {
    return this.users.length;
};

/**
 * Load all users for this game.
 *
 * @param {UserManager~loadCallback} [callback] Callback called when done loading.
 */
UserManager.prototype.load = function(callback) {
    // Store this instance
    const self = this;

    // Determine whether we called back
    var calledBack = false;

    // Get the game mode
    const gameModel = this.game.getGameModel();

    // Load all users for this game that are approved
    Core.model.gameUserModelManager.getGameUsers(gameModel, {
        requested: false
    }, function(err, users) {
        // Call back errors
        if(err !== null) {
            if(_.isFunction(callback))
                callback(err);
            return;
        }

        // Unload all currently loaded users
        self.unload();

        // Create a callback latch
        var latch = new CallbackLatch();

        // Loop through the list of users
        users.forEach(function(user) {
            // Create a user instance
            const userInstance = new User(user, self.game);

            // Load the user instance
            latch.add();
            userInstance.load(function(err) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        if(_.isFunction(callback))
                            callback(err);
                    calledBack = true;
                    return;
                }

                // Add the user instance to the list
                self.users.push(userInstance);

                // Resolve the latch
                latch.resolve();
            });
        });

        // Call back when we're done loading
        latch.then(function() {
            if(_.isFunction(callback))
                callback(null);
        });
    });
};

/**
 * @callback UserManager~loadCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 */

/**
 * Unload all loaded users.
 */
UserManager.prototype.unload = function() {
    // Loop through the list of users
    this.users.forEach(function(user) {
        // Unload the user
        user.unload();
    });
};

// Export the class
module.exports = UserManager;

