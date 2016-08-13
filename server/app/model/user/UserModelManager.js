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

var UserDatabase = require('./UserDatabase');
var HashUtils = require('../../hash/HashUtils');
var ModelInstanceManager = require('../ModelInstanceManager');

/**
 * UserModelManager class.
 *
 * @class
 * @constructor
 */
var UserModelManager = function() {
    /**
     * Model instance manager.
     *
     * @type {ModelInstanceManager}
     */
    this._instanceManager = new ModelInstanceManager(UserModelManager);
};

/**
 * Get a user by it's username.
 *
 * @param username Username of the user.
 * @param {UserModelManager~getUserByUsername} callback Callback with the user.
 */
UserModelManager.prototype.getUserByUsername = function(username, callback) {
    // Store the current instance
    const self = this;

    // Return some user data
    UserDatabase.layerFetchFieldsFromDatabase({username: username}, {_id: true}, function(err, data) {
        // Pass along errors
        if(err !== null)
            callback(err, null);

        // Make sure any is returned, if not return false through the callback
        if(data.length == 0) {
            callback(null, null);
            return;
        }

        // Get the user data
        var rawUserData = data[0];

        // Get the user ID and create an user instance through the instance manager
        var user = self._instanceManager.create(rawUserData._id);

        // Get the user and call it back
        callback(null, user);
    });
};

/**
 * @callback UserManager~getUserByUsername
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {UserModel|null} User instance, or null if no user was found.
 */

/**
 * Get the user by it's credentials.
 * This may be used to validate user credentials such as it's username and password.
 * If one of the fields is missing, null will be returned.
 *
 * @param username Username of the user.
 * @param password Password of the user. (not hashed)
 * @param {UserModelManager~getUserByCredentialsCallback} callback Callback with the user, or null if the credentials were invalid.
 */
UserModelManager.prototype.getUserByCredentials = function(username, password, callback) {
    // Make sure all fields are given
    if(username === undefined || password === undefined || callback === undefined) {
        // Call the callback with nullif available
        if(callback !== undefined)
            callback(null, null);

        // Return
        return;
    }

    // Store the current instance
    const self = this;

    // Return some user data
    UserDatabase.layerFetchFieldsFromDatabase({username: username}, {_id: true, password_hash: true}, function(err, data) {
        // Handle errors
        if(err != null) {
            if(callback != undefined)
                callback(err, null);
            return;
        }

        // Make sure any is returned, if not return false through the callback
        if(data.length == 0) {
            if(callback != undefined)
                callback(null, null);
            return;
        }

        // Get the user data
        var rawUserData = data[0];

        // Gather the user ID, password hash and it's salt
        var passwordHash = rawUserData.password_hash;

        // Compare the password hash to the password
        HashUtils.compare(password, passwordHash, function(err, matched) {
            // Handle errors
            if(err != null) {
                if(callback != undefined)
                    callback(err, null);
                return;
            }

            // Make sure the password is valid
            if(!matched) {
                if(callback != undefined)
                    callback(null, null);
                return;
            }

            // Create a user instance through the instance manager and call it back
            if(callback != undefined)
                callback(null, self._instanceManager.create(rawUserData._id));
        });
    });
};

/**
 * @callback UserManager~getUserByCredentialsCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {UserModel|null} User instance, or null if no user was found.
 */

// Return the created class
module.exports = UserModelManager;
