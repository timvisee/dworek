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

var Core = require('../../../Core');
var User = require('./User');
var UserModel = require('../../model/user/UserModel');

/**
 * UserManager class.
 *
 * @class
 * @constructor
 */
var UserManager = function() {
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
    else {
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
    Core.model.userModelManager.getUserById(userId, function(err, user) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Make sure the stage of this user is active
        user.getStage(function(err, stage) {
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
            var newUser = new User(user);

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
    else {
        callback(new Error('Invalid user ID'));
        return;
    }

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
 * Load all active users, that aren't loaded yet.
 *
 * @param {UserManager~loadActiveUsersCallback} [callback] Callback called when done loading.
 */
UserManager.prototype.loadActiveUsers = function(callback) {
    // TODO: Load all active users here, that aren't loaded yet!

    // Call the callback
    if(callback !== undefined)
        callback(null);
};

/**
 * @callback UserController~loadActiveUsersCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 */

// Export the class
module.exports = UserManager;

