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

var CallbackLatch = require('../../util/CallbackLatch');
var RedisUtils = require('../../redis/RedisUtils');
var Validator = require('../../validator/Validator');
var UserDatabase = require('./UserDatabase');
var HashUtils = require('../../hash/HashUtils');
var ModelInstanceManager = require('../ModelInstanceManager');
var UserModel = require('./UserModel');

/**
 * Redis key root for cache.
 * @type {string}
 */
const REDIS_KEY_ROOT = 'model:user';

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
    this._instanceManager = new ModelInstanceManager(UserModel);
};

/**
 * Check whether the given user ID is valid and exists.
 *
 * @param {ObjectId|string} id The user ID.
 * @param {UserModelManager~isValidUserIdCallback} callback Called with the result or when an error occurred.
 */
UserModelManager.prototype.isValidUserId = function(id, callback) {
    // Validate the object ID
    if(id === null || id === undefined || !ObjectId.isValid(id)) {
        // Call back
        callback(null, false);
        return;
    }

    // Create a callback latch
    var latch = new CallbackLatch();

    // Store the current instance
    const self = this;

    // Convert the ID to an ObjectID
    if(!(id instanceof ObjectId))
        id = new ObjectId(id);

    // TODO: Check an instance for this ID is already available?

    // Determine the Redis cache key
    var redisCacheKey = REDIS_KEY_ROOT + ':' + id.toString() + ':exists';

    // Check whether the user is valid through Redis if ready
    if(RedisUtils.isReady()) {
        // TODO: Update this caching method!
        // Fetch the result from Redis
        latch.add();
        RedisUtils.getConnection().get(redisCacheKey, function(err, result) {
            // Show a warning if an error occurred
            if(err !== null && err !== undefined) {
                // Print the error to the console
                console.error('A Redis error occurred while checking user validity, falling back to MongoDB.')
                console.error(new Error(err));

                // Resolve the latch and return
                latch.resolve();
                return;
            }

            // Resolve the latch if the result is undefined, null or zero
            if(result === undefined || result === null || result == 0) {
                // Resolve the latch and return
                latch.resolve();
                return;
            }

            // The user is valid, create an instance and call back
            //noinspection JSCheckFunctionSignatures
            callback(null, self._instanceManager.create(id));
        });
    }

    // Create a variable to store whether a user exists with the given ID
    var hasUser = false;

    // Fetch the result from MongoDB when we're done with Redis
    latch.then(function() {
        // Query the database and check whether the user is valid
        UserDatabase.layerFetchFieldsFromDatabase({_id: id}, {_id: true}, function(err, data) {
            // Call back errors
            if(err !== null && err !== undefined) {
                // Encapsulate the error and call back
                callback(new Error(err), null);
                return;
            }

            // Determine whether a user exists for this ID
            hasUser = data.length > 0;

            // Call back with the result
            callback(null, hasUser);

            // Store the result in Redis if ready
            if(RedisUtils.isReady()) {
                // Store the results
                RedisUtils.getConnection().setex(redisCacheKey, config.redis.cacheExpire, hasUser ? 1 : 0, function(err) {
                    // Show a warning on error
                    if(err !== null && err !== undefined) {
                        console.error('A Redis error occurred when storing User ID validity, ignoring.');
                        console.error(new Error(err));
                    }
                });
            }
        });
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback UserModelManager~isValidUserIdCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean=} True if a user with this ID exists, false if not.
 */

/**
 * Get a user by it's mail address.
 *
 * @param {string} mail Mail address of the user.
 * @param {UserModelManager~getUserByMailCallback} callback Callback with the user.
 */
UserModelManager.prototype.getUserByMail = function(mail, callback) {
    // Store the current instance
    const self = this;

    // Make sure the mail address is valid
    if(!Validator.isValidMail(mail)) {
        // Call back
        callback(new Error('Invalid mail address given.'));
        return;
    }

    // Format the mail address
    mail = Validator.formatMail(mail);

    // Return some user data
    UserDatabase.layerFetchFieldsFromDatabase({mail}, {_id: true}, function(err, data) {
        // Pass along errors
        if(err !== null) {
            callback(err, null);
            return;
        }

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
 * Called with the user, or when an error occurred.
 *
 * @callback UserManager~getUserByMailCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {UserModel|null} User instance, or null if no user was found.
 */

/**
 * Check whether a user with the given mail address exists.
 *
 * @param {string} mail Mail address of the user.
 * @param {UserModelManager~isUserWithMailCallback} callback Callback with the result or when an error occurred.
 */
UserModelManager.prototype.isUserWithMail = function(mail, callback) {
    // Make sure the mail address is valid
    if(!Validator.isValidMail(mail)) {
        // Call back
        callback(new Error('Invalid mail address given.'), false);
        return;
    }

    // Format the mail address
    mail = Validator.formatMail(mail);

    // Return some user data
    UserDatabase.layerFetchFieldsFromDatabase({mail}, {_id: true}, function(err, data) {
        // Pass along errors
        if(err !== null) {
            callback(err, null);
            return;
        }

        // Call back the result
        callback(null, data.length > 0);
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback UserManager~isUserWithMailCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean} True if the mail address is used and exists, false if not.
 */

/**
 * Get the user by it's credentials.
 * This may be used to validate user credentials such as it's mail address and password.
 * If one of the fields is missing, null will be returned.
 *
 * @param mail Mail address of the user.
 * @param password Password of the user. (not hashed)
 * @param {UserModelManager~getUserByCredentialsCallback} callback Callback with the user, or null if the credentials were invalid.
 */
UserModelManager.prototype.getUserByCredentials = function(mail, password, callback) {
    // Make sure all fields are given
    if(mail === undefined || password === undefined || callback === undefined) {
        // Call the callback with nullif available
        if(callback !== undefined)
            callback(new Error('Invalid user credentials given.'), null);

        // Return
        return;
    }

    // Make sure a password is given
    if(password.length === 0) {
        // Call back with an error
        callback(new Error('No password given.'));
        return;
    }

    // Make sure the mail is valid
    if(!Validator.isValidMail(mail)) {
        // Call back with an error
        callback(new Error('Invalid mail address given.'));
        return;
    }

    // Format the mail address
    mail = Validator.formatMail(mail);

    // Store the current instance
    const self = this;

    // Return some user data
    UserDatabase.layerFetchFieldsFromDatabase({
        mail
    }, {
        _id: true,
        password_hash: true
    }, function(err, data) {
        // Handle errors
        if(err != null) {
            callback(err, null);
            return;
        }

        // Make sure any is returned, if not return false through the callback
        if(data.length == 0) {
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
                callback(err, null);
                return;
            }

            // Make sure the password is valid
            if(!matched) {
                callback(null, null);
                return;
            }

            // Create a user instance through the instance manager and call it back
            callback(null, self._instanceManager.create(rawUserData._id));
        });
    });
};

/**
 * @callback UserManager~getUserByCredentialsCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {UserModel|null} User instance, or null if no user was found.
 */

/**
 * Flush the cache for this model manager.
 *
 * @param {UserModelManager~flushCacheCallback} [callback] Called on success or when an error occurred.
 */
UserModelManager.prototype.flushCache = function(callback) {
    // Determine the cache key for this manager and wildcard it
    const cacheKey = REDIS_KEY_ROOT + ':*';

    // Create a latch
    var latch = new CallbackLatch();

    // Flush the cache
    latch.add();
    RedisUtils.flushKeys(cacheKey, function(err, keyCount) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Resolve the latch
        latch.resolve();
    });

    // Delete the internal model cache
    this._instanceManager.clear(true);

    // Call back when we're done
    latch.then(function() {
        if(callback !== undefined)
            callback(null);
    });
};

/**
 * Called on success or when an error occurred.
 *
 * @callback UserModelManager~flushCacheCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

// Return the created class
module.exports = UserModelManager;
