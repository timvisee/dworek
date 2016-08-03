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

var config = require('../../config');
var SessionDatabase = require('./SessionDatabase');
var Session = require('./Session');
var User = require('../user/User');
var RedisUtil = require('../redis/RedisUtils');
var TokenGenerator = require('../token/TokenGenerator');
var ObjectId = require('mongodb').ObjectId;

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
 * Constructor.
 *
 * @returns {SessionManager} SessionManager instance.
 */
var SessionManager = function() {};

/**
 * Create a new session for the given user.
 *
 * @param {User} user User this session is created for.
 * @param {string} ip IP address of the client.
 * @param {function} callback (err, {ObjectId) [sessionId], {string} [token]) Callback with the result as boolean.
 */
SessionManager.createSession = function(user, ip, callback) {
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
 * @param {function} callback (err, {Session|null} user) Callback with the session, or null.
 */
SessionManager.getSessionByTokenIfValid = function(token, callback) {
    // Make sure this token is allowed
    if(!SessionManager.isAllowedSessionToken(token)) {
        // Call back
        callback(null);
        return;
    }

    // Determine the cache key and get the Redis client
    // TODO: Escape token, or at least make sure it's valid based on it's characters/length?
    var cacheKey = 'api:session:' + token + ':sessionId';
    var redis = RedisUtil.getRedis();

    // Cache the result if cache is ready
    var cacheResult = function(userId) {
        if(RedisUtil.isReady()) {
            // Store the value
            redis.set(cacheKey, userId);
            redis.expire(cacheKey, CACHE_TOKEN_VALID_EXPIRE);
        }
    };

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

            // Create a session with it's ID
            var session = new Session(rawSessionData._id);

            // Cache the database results in the session object
            session.layerCacheDatabaseResult(rawSessionData);

            // Get the user and call it back and cache the result
            callback(null, session);
            cacheResult(session.getIdHex());
        });
    };

    // Get the result from cache if cache is available
    if(RedisUtil.isReady()) {
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
                // Callback with null if the value is zero
                if(value == 0) {
                    callback(null, null);
                    return;
                }

                // Convert the hex ID into an object, and call it back
                callback(null, new Session(new ObjectId(value)));
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
 * @param {function} callback (err, {User|null} user) Callback with the session user, or null.
 */
SessionManager.getSessionUserByTokenIfValid = function(token, callback) {
    // Make sure this token is allowed
    if(!SessionManager.isAllowedSessionToken(token)) {
        // Call back
        callback(null, null);
        return;
    }

    // Determine the cache key and get the Redis client
    // TODO: Escape token, or at least make sure it's valid based on it's characters/length?
    var cacheKey = 'api:session:' + token + ':userId';
    var redis = RedisUtil.getRedis();

    // Cache the result if cache is ready
    var cacheResult = function(userId) {
        if(RedisUtil.isReady()) {
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

            // Get the user and call it back and cache the result
            callback(null, new User(userId));
            cacheResult(userId.toString());
        });
    };

    // Get the result from cache if cache is available
    if(RedisUtil.isReady()) {
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
                // Callback with null if the value is zero
                if(value == 0) {
                    callback(null, null);
                    return;
                }

                // Convert the hex ID into an object, and call it back
                callback(null, new User(new ObjectId(value)));
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
SessionManager.isValidSessionToken = function(token, callback) {
    // Make sure this token is allowed
    if(!SessionManager.isAllowedSessionToken(token)) {
        // Call back
        callback(null, false);
        return;
    }

    // Determine the cache key and get the Redis client
    // TODO: Escape token, or at least make sure it's valid based on it's characters/length?
    var cacheKey = 'api:session:' + token + ':valid';
    var redis = RedisUtil.getRedis();

    // Cache the result if cache is ready
    var cacheResult = function(valid) {
        if(RedisUtil.isReady()) {
            // Store the value
            redis.set(cacheKey, valid);
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
    if(RedisUtil.isReady()) {
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
                callback(null, !!value);
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
SessionManager.isAllowedSessionToken = function(token) {
    // Make sure the length is allowed
    if(token.length < SESSION_TOKEN_MIN_LENGTH || token.length > SESSION_TOKEN_MAX_LENGTH)
        return false;

    // Check the token characters
    return token.match(TokenGenerator.TOKEN_REGEX) != null;
};

/**
 * Get all sessions for the given user.
 *
 * @param {User} user User to get the session tokens for.
 * @param {function} callback (err, {array} Array of sessions.) Callback with the an array of sessions.
 */
SessionManager.getUserSessions = function(user, callback) {
    // Make sure the user is valid
    if(user == null) {
        // Call back with an error, and return
        callback(new Error('Invalid user instance.'));
        return;
    }

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
            // Construct the session
            const session = new Session(entry._id);

            // Put the session in the list of sessions
            sessions.push(session);

            // Cache the database output in the session
            session.layerCacheDatabaseResult(entry);
        });

        // Call back the list of tokens
        callback(null, sessions);
    });
};

// Return the created class
module.exports = SessionManager;
