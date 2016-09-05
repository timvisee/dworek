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

// TODO: Implement Redis connection pool!

var _ = require('lodash');

var config = require('../../config');
var redis = require('redis');

var CallbackLatch = require('../util/CallbackLatch');

/**
 * Defines whether the Redis client is ready.
 *
 * @type {boolean} True if ready, false if not.
 */
var ready = false;

/**
 * Redis client instance.
 *
 * @type {RedisClient} Redis client instance.
 */
var redisClient = null;

/**
 * RedisUtils class.
 *
 * @class
 * @constructor
 */
var RedisUtils = function() {};

/**
 * Connect to Redis as configured in the configuration file.
 *
 * @param {RedisUtils~connectCallback} [callback] Called when a connection has been made, or when failed to connect.
 */
RedisUtils.connect = function(callback) {
    // Do not connect if Redis usage is disabled
    if(!config.redis.enable) {
        // Show a warning
        console.log('Not connecting to Redis. Redis is disabled in the configuration.');

        // Call the callback if available
        if(callback != undefined)
            callback(null, null);
        return;
    }

    // Show a status message
    console.log('Connecting to Redis...');

    // Connect to the redis client
    redisClient = redis.createClient(config.redis.url);

    // Handle connect
    redisClient.on('connect', function() {
        // Show a status message
        console.log('Successfully established a connection to Redis!');

        // Reset the ready flag
        ready = false;
    });

    // Handle ready
    redisClient.on('ready', function(err) {
        // Show a message
        console.log('Redis is ready!');

        // Set the ready flag
        ready = true;

        // Call the callback
        if(callback != undefined)
            callback(err, redisClient);
    });

    // Handle reconnecting
    redisClient.on('reconnecting', function() {
        // Reset the ready flag
        ready = false;
    });

    // Handle errors
    redisClient.on('error', function(err) {
        // Show an error message
        console.warn('Redis error: ' + err);

        // Reset the ready flag
        ready = false;

        // Call the callback
        if(callback != undefined)
            callback(err, undefined);
    });

    // Handle end
    redisClient.on('end', function() {
        // Reset the ready flag
        ready = false;
    });
};

/**
 * @callback RedisUtils~connectCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {RedisClient} Redis client instance with the connection if the connection was successful.
 */

/**
 * Get the Redis instance. A connection must have been established, or null will be returned.
 *
 * @returns {RedisClient} RedisClient instance.
 */
RedisUtils.getConnection = function() {
    return redisClient;
};

/**
 * Check whether the Redis client is ready.
 *
 * @returns {boolean} True if ready, false if not.
 */
RedisUtils.isReady = function() {
    return ready;
};

/**
 * Flush the given keys from Redis.
 * Wildcards are supported using '*' to remove multiple keys.
 * Keys won't be flushed if Redis isn't ready when the function is invoked. Zero will be called back in that case.
 * Given keys that don't exist are ignored.
 *
 * @param {Array|string} keys Array of keys or a single key as a string.
 * @param {RedisUtils~flushKeysCallback} [callback] Called on success or on error.
 */
RedisUtils.flushKeys = function(keys, callback) {
    // Convert the keys parameter to an array, if it isn't an array already
    if(!_.isArray(keys)) {
        // Return if the key isn't a string
        if(!_.isString(keys))
            throw new Error('Invalid key');

        // Convert the key into an array
        keys = [keys];
    }

    // Make sure Redis is ready
    if(!RedisUtils.isReady())
        return 0;

    // Keep track whether we called back or not
    var calledBack = false;

    // Create a callback latch for all keys
    var latch = new CallbackLatch();

    // Create a list with keys to delete
    var deleteKeys = [];

    // Loop through the list of keys
    keys.forEach(function(key) {
        // Make sure the key is a string
        if(!_.isString(key))
            return;

        // Trim the key
        key = key.trim();

        // Add the key to the list of keys to delete if it doesn't contain a wildcard character
        if(key.includes('*')) {
            deleteKeys.push(key);
            return;
        }

        // Add a callback latch
        latch.add();

        // Fetch all keys for this wildcard key
        redis.keys(key, function(err, replyKeys) {
            // Call back if an error occurred
            if(err !== null) {
                // Return if we called back already
                if(calledBack)
                    return;

                // Encapsulate the error
                const error = new Error(err);

                // Call back with the error, updated the called back flag and return
                if(callback !== undefined)
                    callback(error, 0);
                calledBack = true;
                return;
            }

            // Add the fetched keys to the keys array
            deleteKeys = deleteKeys.concat(replyKeys);

            // Resolve the latch
            latch.resolve();
        });
    });

    // Call back with the number of deleted keys when we're done
    latch.then(function() {
        // Get the Redis instance
        const redis = RedisUtils.getConnection();

        // Delete the list of keys
        redis.del(deleteKeys, function(err, reply) {
            // Call back errors
            if(err !== null) {
                // Return if we called back already
                if(calledBack)
                    return;

                // Encapsulate the error
                const error = new Error(err);

                // Call back with the error, updated the called back flag and return
                if(callback !== undefined)
                    callback(error, 0);
                calledBack = true;
                return;
            }

            // Call back the number of deleted keys
            if(callback !== undefined)
                callback(null, parseInt(reply, 10));
        });
    });
};

/**
 * Called on success or on error.
 *
 * @callback RedisUtils~flushKeysCallback
 * @param {Error|null} Error instance if an error occurred, false on success.
 * @param {Number} Number of deleted Redis keys.
 */

// Export the class
module.exports = RedisUtils;