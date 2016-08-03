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

var bcrypt = require('bcrypt');

var config = require('../../config');
var UserDatabase = require('./UserDatabase');
var User = require('./User');

/**
 * Constructor.
 *
 * @returns {UserManager} UserManager instance.
 */
var UserManager = function() { };

/**
 * Get a user by it's username.
 *
 * @param username Username of the user.
 * @param {function} callback (err, {User|null} user) Callback with the user, or null.
 */
UserManager.getUserByUsername = function(username, callback) {
    // Return some user data
    UserDatabase.layerFetchFieldsFromDatabase({username: username}, {_id: true}, function(err, data) {
        // TODO: Catch errors from err parameter!

        // Make sure any is returned, if not return false through the callback
        if(data.length == 0) {
            callback(null, null);
            return;
        }

        // Get the user data-*
        var rawUserData = data[0];

        // Get the user ID
        var userId = rawUserData._id.toString();

        // Get the user and call it back
        callback(null, new User(userId));
    });
};

/**
 * Get the user by it's credentials.
 * This may be used to validate user credentials such as it's username and password.
 * If one of the fields is missing, null will be returned.
 *
 * @param username Username of the user.
 * @param password Password of the user. (not hashed)
 * @param {function} callback (err, {User|null} user) Callback with the user, or null if the credentials were invalid.
 */
UserManager.getUserByCredentials = function(username, password, callback) {
    // Make sure all fields are given
    if(username === undefined || password === undefined || callback === undefined) {
        // Call the callback with nullif available
        if(callback !== undefined)
            callback(null, null);

        // Return
        return;
    }

    // Return some user data
    UserDatabase.layerFetchFieldsFromDatabase({username: username}, {_id: true, password_hash: true}, function(err, data) {
        // Handle errors
        if(err != null) {
            if(callback != undefined)
                callback(err);
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

        // Get the global salt and hash round count
        var globalSalt = config.user.salt;

        // Salt the password with the global salt
        var passwordSalted = password + globalSalt;

        // TODO: Use this to hash passwords for new users
        // var hashRounds = config.security.hashRounds;
        // bcrypt.hash(passwordSalted, hashRounds, function(err, hash) {
        //     //console.log('Hash: ' + hash);
        // });

        // Compare the password with the password hash
        bcrypt.compare(passwordSalted, passwordHash, function(err, res) {
            // Handle errors
            if(err != null) {
                if(callback != undefined)
                    callback(err);
                return;
            }

            // Make sure the password is valid
            if(!res) {
                if(callback != undefined)
                    callback(null, null);
                return;
            }

            // Get the user and call it back
            if(callback != undefined)
                callback(null, new User(rawUserData._id));
        });
    });
};

// Return the created class
module.exports = UserManager;
