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
var CallbackLatch = require('../../util/CallbackLatch');
var RedisUtils = require('../../redis/RedisUtils');
var Validator = require('../../validator/Validator');
var FactoryDatabase = require('./FactoryDatabase');
var HashUtils = require('../../hash/HashUtils');
var ModelInstanceManager = require('../ModelInstanceManager');
var FactoryModel = require('./FactoryModel');

/**
 * Redis key root for cache.
 * @type {string}
 */
const REDIS_KEY_ROOT = 'model:factory';

/**
 * FactoryModelManager class.
 *
 * @class
 * @constructor
 */
var FactoryModelManager = function() {
    /**
     * Model instance manager.
     *
     * @type {ModelInstanceManager}
     */
    this._instanceManager = new ModelInstanceManager(FactoryModel);
};

/**
 * Check whether the given factory ID is valid and exists.
 *
 * @param {ObjectId|string} id The factory ID.
 * @param {FactoryModelManager~isValidFactoryIdCallback} callback Called with the result or when an error occurred.
 */
FactoryModelManager.prototype.isValidFactoryId = function(id, callback) {
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

    // Check whether the factory is valid through Redis if ready
    if(RedisUtils.isReady()) {
        // TODO: Update this caching method!
        // Fetch the result from Redis
        latch.add();
        RedisUtils.getConnection().get(redisCacheKey, function(err, result) {
            // Show a warning if an error occurred
            if(err !== null && err !== undefined) {
                // Print the error to the console
                console.error('A Redis error occurred while checking factory validity, falling back to MongoDB.')
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

            // The factory is valid, create an instance and call back
            //noinspection JSCheckFunctionSignatures
            callback(null, self._instanceManager.create(id));
        });
    }

    // Create a variable to store whether a factory exists with the given ID
    var hasFactory = false;

    // Fetch the result from MongoDB when we're done with Redis
    latch.then(function() {
        // Query the database and check whether the factory is valid
        FactoryDatabase.layerFetchFieldsFromDatabase({_id: id}, {_id: true}, function(err, data) {
            // Call back errors
            if(err !== null && err !== undefined) {
                // Encapsulate the error and call back
                callback(new Error(err), null);
                return;
            }

            // Determine whether a factory exists for this ID
            hasFactory = data.length > 0;

            // Call back with the result
            callback(null, hasFactory);

            // Store the result in Redis if ready
            if(RedisUtils.isReady()) {
                // Store the results
                RedisUtils.getConnection().setex(redisCacheKey, config.redis.cacheExpire, hasFactory ? 1 : 0, function(err) {
                    // Show a warning on error
                    if(err !== null && err !== undefined) {
                        console.error('A Redis error occurred when storing Factory ID validity, ignoring.');
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
 * @callback FactoryModelManager~isValidFactoryIdCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean=} True if a factory with this ID exists, false if not.
 */

/**
 * Flush the cache for this model manager.
 *
 * @param {FactoryModelManager~flushCacheCallback} [callback] Called on success or when an error occurred.
 */
FactoryModelManager.prototype.flushCache = function(callback) {
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
 * @callback FactoryModelManager~flushCacheCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

// Return the created class
module.exports = FactoryModelManager;
