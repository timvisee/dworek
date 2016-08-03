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

var config = require('../../config');
var redis = require('redis');

/**
 * RedisUtils class.
 *
 * @class
 * @constructor
 */
var RedisUtils = function() {
    /**
     * Defines whether the Redis client is ready.
     *
     * @type {boolean} True if ready, false if not.
     */
    this.ready = false;

    /**
     * Redis client instance.
     *
     * @type {RedisClient} Redis client instance.
     */
    this.redisClient = null;
};

/**
 * Connect to Redis as configured in the configuration file.
 *
 * @param {RedisUtils~connectCallback} [callback] Called when a connection has been made, or when failed to connect.
 */
RedisUtils.prototype.connect = function(callback) {
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
    this.redisClient = redis.createClient(config.redis.url);

    // Handle connect
    this.redisClient.on('connect', function() {
        // Show a status message
        console.log('Successfully established a connection to Redis!');

        // Reset the ready flag
        this.ready = false;
    });

    // Store this instance
    let instance = this;

    // Handle ready
    this.redisClient.on('ready', function(err) {
        // Show a message
        console.log('Redis is ready!');

        // Set the ready flag
        this.ready = true;

        // Call the callback
        if(callback != undefined)
            callback(err, instance.redisClient);
    });

    // Handle reconnecting
    this.redisClient.on('reconnecting', function() {
        // Reset the ready flag
        this.ready = false;
    });

    // Handle errors
    this.redisClient.on('error', function(err) {
        // Show an error message
        console.warn('Redis error: ' + err);

        // Reset the ready flag
        this.ready = false;

        // Call the callback
        if(callback != undefined)
            callback(err, undefined);
    });

    // Handle end
    this.redisClient.on('end', function() {
        // Reset the ready flag
        this.ready = false;
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
RedisUtils.prototype.getRedis = function() {
    return this.redisClient;
};

/**
 * Check whether the Redis client is ready.
 *
 * @returns {boolean} True if ready, false if not.
 */
RedisUtils.prototype.isReady = function() {
    return this.ready;
};

// Export the class
module.exports = RedisUtils;