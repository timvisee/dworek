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

var config = require('../../../config');
var Core = require('../../../Core');
var SessionDatabase = require('./SessionDatabase');
var RedisUtils = require('../../redis/RedisUtils');
var TokenGenerator = require('../../token/TokenGenerator');
var ModelInstanceManager = require('../ModelInstanceManager');
var SessionModel = require('./SessionModel');
var CallbackLatch = require('../../util/CallbackLatch');

/**
 * Time in seconds for token validity to expire in cache.
 * @type {number}
 */
const CACHE_TOKEN_VALID_EXPIRE = 60;

/**
 * Minimum length of a session token.
 */
const SESSION_TOKEN_MIN_LENGTH = Math.min(config.session.tokenLength, 32);

/**
 * Maximum length of a session token.
 */
const SESSION_TOKEN_MAX_LENGTH = Math.max(config.session.tokenLength, 64);

/**
 * Redis key root for cache.
 * @type {string}
 */
const REDIS_KEY_ROOT = 'model:session';

/**
 * Constructor.
 *
 * @returns {SessionModelManager} SessionModelManager instance.
 */
var SessionModelManager = function() {
    /**
     * Model instance manager.
     *
     * @type {ModelInstanceManager}
     */
    this._instanceManager = new ModelInstanceManager(SessionModel);
};

/**
 * Create a new session for the given user.
 *
 * @param {UserModel} user User this session is created for.
 * @param {string} ip IP address of the client.
 * @param {function} callback (err, {ObjectId) [sessionId], {string} [token]) Callback with the result as boolean.
 */
SessionModelManager.prototype.createSession = function(user, ip, callback) {
    // Generate a session token
    TokenGenerator.generateToken(config.security.tokenLength, function(err, token) {
        // Handle errors
        if(err != null) {
            // Call back with the error
            callback(err);
            return;
        }

        // Add the session to the database
        SessionDatabase.addSession(user, token, ip, function(err, sessionId) {
            // Handle errors
            if(err != null) {
                callback(err, null);
                return;
            }

            // Call back with the newly created session and token
            callback(null, sessionId, token);

            // TODO: Add the session to cache!
        });
    });
};

/**
 * Get the session by the given session token if the session is valid.
 *
 * @param token The session token.
 * @param {function} callback (err, {SessionModel|null} user) Callback with the session, or null.
 */
SessionModelManager.prototype.getSessionByTokenIfValid = function(token, callback) {
    // Make sure this token is allowed
    if(!this.isAllowedSessionToken(token)) {
        // Call back
        callback(null);
        return;
    }

    // Determine the cache key and get the Redis client
    // TODO: Update this caching method!
    // TODO: Escape token, or at least make sure it's valid based on it's characters/length?
    var cacheKey = 'api:session:' + token + ':sessionId';
    var redis = RedisUtils.getConnection();

    // Cache the result if cache is ready
    var cacheResult = function(userId) {
        if(RedisUtils.isReady()) {
            // Store the value
            redis.set(cacheKey, userId);
            redis.expire(cacheKey, CACHE_TOKEN_VALID_EXPIRE);
        }
    };

    // Store the current instance
    const self = this;

    // Function to retrieve the value from the database
    var getFromDatabase = function() {
        // Return some user data
        SessionDatabase.layerFetchFieldsFromDatabase({token: token}, {_id: true, user_id: true, expire_date: true}, function(err, data) {
            // TODO: Make sure the token of the current request is valid!
            // TODO: Compare the API of the session with the current requesting API (must be equal).

            // Make sure any is returned, if not return false through the callback
            if(data.length == 0) {
                callback(null, null);
                cacheResult(0);
                return;
            }

            // Get the raw session data
            var rawSessionData = data[0];

            // Get the expiration date and check whether the session has expired
            if(rawSessionData.expire_date < new Date()) {
                // Callback false
                callback(null, null);
                cacheResult(0);

                // TODO: Delete the session from the database?
            }

            // Create a session with it's ID through the instance manager
            var session = self._instanceManager.create(rawSessionData._id);

            // Cache the database results in the session object
            session.layerCacheDatabaseResult(rawSessionData);

            // Get the user and call it back and cache the result
            callback(null, session);
            cacheResult(session.getIdHex());
        });
    };

    // Get the result from cache if cache is available
    if(RedisUtils.isReady()) {
        // Try to fetch the validity data from cache
        redis.get(cacheKey, function(err, id) {
            // Handle errors
            if(err != undefined) {
                // Print the error to the console
                console.warn('Redis error: ' + err);

                // Get and return the value from the database
                getFromDatabase();
                return;
            }

            // If the value isn't null, return it
            if(id != null) {
                // Callback with null if the value is zero
                if(id == 0) {
                    callback(null, null);
                    return;
                }

                // Get the session ID, create a session instance through the instance manager, and call it back
                callback(null, self._instanceManager.create(id));
                return;
            }

            // Unable to retrieve data from cache, get it form the database
            getFromDatabase();
        });

    } else
        // Get the validity straight from the database because cache isn't ready
        getFromDatabase();
};

/**
 * Get the session user by the given session token if the session is valid.
 *
 * @param token The session token.
 * @param {function} callback (err, {UserModel|null} user) Callback with the session user, or null.
 */
SessionModelManager.prototype.getSessionUserByTokenIfValid = function(token, callback) {
    // Make sure this token is allowed
    if(!this.isAllowedSessionToken(token)) {
        // Call back
        callback(null, null);
        return;
    }

    // Determine the cache key and get the Redis client
    // TODO: Escape token, or at least make sure it's valid based on it's characters/length?
    var cacheKey = 'api:session:' + token + ':userId';
    var redis = RedisUtils.getConnection();

    // Cache the result if cache is ready
    var cacheResult = function(userId) {
        if(RedisUtils.isReady()) {
            // Store the value
            redis.set(cacheKey, userId);
            redis.expire(cacheKey, CACHE_TOKEN_VALID_EXPIRE);
        }
    };

    // Function to retrieve the value from the database
    var getFromDatabase = function() {
        // Return some user data
        SessionDatabase.layerFetchFieldsFromDatabase({token: token}, {user_id: true, expire_date: true}, function(err, data) {
            // TODO: Make sure the token of the current request is valid!
            // TODO: Compare the API of the session with the current requesting API (must be equal).

            // Make sure any is returned, if not return false through the callback
            if(data.length == 0) {
                callback(null, null);
                cacheResult(0);
                return;
            }

            // Get the raw session data
            var rawSessionData = data[0];

            // Get the expiration date and check whether the session has expired
            if(rawSessionData.expire_date < new Date()) {
                // Callback false
                callback(null, null);
                cacheResult(0);

                // TODO: Delete the session from the database?
            }

            // Get the user ID
            var userId = rawSessionData.user_id;

            // Get the user, create an instance through the instance manager and call it back and cache the result
            callback(null, Core.model.userModelManager._instanceManager.create(userId));
            cacheResult(userId.toString());
        });
    };

    // Get the result from cache if cache is available
    if(RedisUtils.isReady()) {
        // Try to fetch the validity data from cache
        redis.get(cacheKey, function(err, userId) {
            // Handle errors
            if(err != undefined) {
                // Print the error to the console
                console.warn('Redis error: ' + err);

                // Get and return the value from the database
                getFromDatabase();
                return;
            }

            // If the value isn't null, return it
            if(userId != null) {
                // Callback with null if the value is zero
                if(userId == 0) {
                    callback(null, null);
                    return;
                }

                // Get the user ID, create and instance through the instance manager and call it back
                callback(null, Core.model.userModelManager._instanceManager.create(userId));
                return;
            }

            // Unable to retrieve data from cache, get it form the database
            getFromDatabase();
        });

    } else
        // Get the validity straight from the database because cache isn't ready
        getFromDatabase();
};

/**
 * Check whether a session token is valid.
 *
 * @param token The session token.
 * @param {function} callback (err, {boolean} valid) Callback with the result as boolean.
 */
// TODO: This method might give incorrect results, fix that! (possible callback latch glitch)
SessionModelManager.prototype.isValidSessionToken = function(token, callback) {
    // Make sure this token is allowed
    if(!this.isAllowedSessionToken(token)) {
        // Call back
        callback(null, false);
        console.log('A');
        return;
    }

    // Determine the cache key and get the Redis client
    // TODO: Escape token, or at least make sure it's valid based on it's characters/length?
    var cacheKey = 'api:session:' + token + ':valid';
    var redis = RedisUtils.getConnection();

    // Cache the result if cache is ready
    var cacheResult = function(valid) {
        if(RedisUtils.isReady()) {
            // Store the value
            redis.set(cacheKey, valid ? '1' : '0');
            redis.expire(cacheKey, CACHE_TOKEN_VALID_EXPIRE);
        }
    };

    // Function to retrieve the value from the database
    var getFromDatabase = function() {
        // Return some user data
        SessionDatabase.layerFetchFieldsFromDatabase({key: token}, {expire_date: true}, function(err, data) {
            // TODO: Catch errors from err parameter!
            // TODO: Make sure the token of the current request is valid!
            // TODO: Make sure the API application of this token is enabled

            // Make sure any is returned, if not return false through the callback
            if(data.length == 0) {
                callback(null, false);
                cacheResult(false);
                return;
            }

            // Get the raw session data
            var rawSessionData = data[0];

            // Get the expiration date and check whether the session has expired
            if(rawSessionData.expire_date < new Date()) {
                // Callback false
                callback(null, false);
                cacheResult(false);

                // TODO: Delete the session from the database?
            }

            // The session seems to be valid, callback true
            callback(null, true);
            cacheResult(true);
        });
    };

    // Get the result from cache if cache is available
    if(RedisUtils.isReady()) {
        // Try to fetch the validity data from cache
        redis.get(cacheKey, function(err, value) {
            // Handle errors
            if(err != undefined) {
                // Print the error to the console
                console.warn('Redis error: ' + err);

                // Get and return the value from the database
                getFromDatabase();
                return;
            }

            // If the value isn't null, return it
            if(value != null) {
                callback(null, value == '1');
                return;
            }

            // Unable to retrieve data from cache, get it form the database
            getFromDatabase();
        });

    } else
        // Get the validity straight from the database because cache isn't ready
        getFromDatabase();
};

/**
 * Check whether the given token is allowed.
 * This does not check whether a token is valid.
 *
 * @param token Token.
 * @returns {boolean} True if allowed, false if not.
 */
SessionModelManager.prototype.isAllowedSessionToken = function(token) {
    // Make sure the length is allowed
    if(token.length < SESSION_TOKEN_MIN_LENGTH || token.length > SESSION_TOKEN_MAX_LENGTH)
        return false;

    // Check the token characters
    // TODO: Make TOKEN_REGEX variable static in TokenGenerator class to support this
    return token.match(TokenGenerator.TOKEN_REGEX) != null;
};

/**
 * Get all sessions for the given user.
 *
 * @param {UserModel} user User to get the session tokens for.
 * @param {function} callback (err, {array} Array of sessions.) Callback with the an array of sessions.
 */
SessionModelManager.prototype.getUserSessions = function(user, callback) {
    // Make sure the user is valid
    if(user == null) {
        // Call back with an error, and return
        callback(new Error('Invalid user instance.'));
        return;
    }

    // Store the current instance
    const self = this;

    // Return some user data
    // TODO: Do not list sessions that are expired!
    // TODO: Make additional fields configurable!
    SessionDatabase.layerFetchFieldsFromDatabase({user_id: user.getId()}, {_id: true, token: true, create_date: true, expire_date: true, api_app_id: true}, function(err, data) {
        // Make sure any is returned, if not return false through the callback
        if(data.length == 0) {
            callback(null, null);
            //cacheResult(0);
            return;
        }

        // Create an array with sessions
        var sessions = [];

        // Loop through each result and add it's token to the array
        data.forEach(function(entry) {
            // Create a new session through the instance manager
            const session = self._instanceManager.create(entry._id);

            // Put the session in the list of sessions
            sessions.push(session);

            // Cache the database output in the session
            session.layerCacheDatabaseResult(entry);
        });

        // Call back the list of tokens
        callback(null, sessions);
    });
};

/**
 * Flush the cache for this model manager.
 *
 * @param {SessionModelManager~flushCacheCallback} [callback] Called on success or when an error occurred.
 */
SessionModelManager.prototype.flushCache = function(callback) {
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
 * @callback SessionModelManager~flushCacheCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

// Return the created class
module.exports = SessionModelManager;
