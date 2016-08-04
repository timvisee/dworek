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

var util = require('util');
var async = require('async');
var SmartCallback = require('../util/SmartCallback');
var ObjectCache = require('../cache/ObjectCache');
var MongoUtils = require('../mongo/MongoUtils');
var RedisUtils = require('../redis/RedisUtils');

/**
 * Time in seconds for a cached database field to expire.
 * @type {number}
 */
const CACHE_FIELD_EXPIRE = 60;

/**
 * Cache key prefix for database object layer instances.
 *
 * @type {string}
 */
const CACHE_KEY_PREFIX = 'dbLayer:';

/**
 * Constructor.
 *
 * @returns {DatabaseObjectLayer} DatabaseObjectLayer instance.
 *
 * @private
 */
var DatabaseObjectLayer = function() {
    // Instantiated directly, show a warning
    console.warn('The DatabaseObjectLayer class should never be instantiated directly!');
};

/**
 * Parser to parse a date object to store it in a Redis instance.
 *
 * @param {Date|null} date Date to be parsed.
 *
 * @returns {string|null} Date object as a string.
 *
 * @constant
 */
DatabaseObjectLayer.LAYER_PARSER_DATE_TO_REDIS = function(date) {
    // Return the date string if not null
    return date != null ? date.toISOString() : null;
};

/**
 * Parser to parse a date object as string representation from a Redis instance.
 *
 * @param {string|null} date Date as a string to be parsed.
 *
 * @returns {Date|null} Date object.
 *
 * @constant
 */
DatabaseObjectLayer.LAYER_PARSER_DATE_FROM_REDIS = function(date) {
    // Return the date object if not null
    return date != null ? new Date(date) : null;
};

/**
 * Asynchronous queue for fields to be stored in Redis cache.
 *
 * @private
 * @constant
 */
DatabaseObjectLayer._LAYER_REDIS_CACHE_QUEUE = async.queue(function(task, callback) {
    // Ensure Redis is ready
    if(!RedisUtils.isReady()) {
        callback();
        return;
    }

    // Get the Redis instance
    // TODO: Store this globally?
    const redis = RedisUtils.getRedis();

    // Set the cached value through the cache setter
    var cacheValue = task.value;
    const cacheSetter = task.parserToRedis;
    if(cacheSetter != undefined)
        cacheValue = cacheSetter(cacheValue);

    // Store the value
    redis.set(task.cacheKey, cacheValue);
    redis.expire(task.cacheKey, CACHE_FIELD_EXPIRE);

    // Were done, call back
    callback();
});

/**
 * Apply the database object base to the object that is inheriting this class.
 *
 * @param {object} instance Object instance that is extending this database object layer.
 * @param {string} dbCollectionName The collection name of the object's database.
 * @param {object} fieldConfig Field configuration for this object.
 */
DatabaseObjectLayer.prototype.layerApply = function(instance, dbCollectionName, fieldConfig) {
    /**
     * Local object cache.
     *
     * @type {ObjectCache}
     */
    instance._localCache = new ObjectCache();

    /**
     * MongoDB database collection name.
     *
     * @type {string}
     */
    instance._dbCollectionName = dbCollectionName;

    /**
     * Objects field configuration.
     *
     * @type {{}}
     */
    instance._fieldConfig = fieldConfig || {};
};

/**
 * Get the cache key root for this object.
 *
 * @returns {string} Object's cache key root.
 *
 * @private
 */
DatabaseObjectLayer.prototype._getCacheKeyRoot = function() {
    //noinspection JSUnresolvedVariable,JSUnresolvedFunction
    return CACHE_KEY_PREFIX + this._dbCollectionName + ':' + this.getIdHex() + ':';
};

/**
 * Get the cache key of this object for the given field.
 *
 * @param {string} fieldName Name of the field.
 *
 * @returns {string} Cache key for this field.
 *
 * @private
 */
DatabaseObjectLayer.prototype._getCacheKeyField = function(fieldName) {
    return this._getCacheKeyRoot() + fieldName;
};

/**
 * Get the cache local instance.
 *
 * @returns {ObjectCache} Local cache instance.
 */
DatabaseObjectLayer.prototype.layerGetLocalCache = function() {
    //noinspection JSUnresolvedVariable
    return this._localCache;
};

/**
 * Fetch the value for the given field. Proper caching is handled automatically.
 *
 * The value will be fetched from all cache stacks it's available in, this is to reduce performance and processing time.
 * The field fetched from the database are cached dynamically in the best suitable cache stack to improve performance for
 * later usage. The cache stack that is used will be determined by the head of the field within a given period
 * of time.
 *
 * Data that is frequently requested and/or updated will have a great performance benefit. Fetching the data through
 * this method well be more than 10 times faster than a single database call for frequent usage.
 *
 * Cache stacks that are unavailable at the moment of execution will be ignored. If all cache stacks are offline,
 * we'll fall back to the database.
 *
 * @param {String} fieldName Name of the field to get as configured.
 * @param {function} callback (err, value) Callback with the value.
 *
 * @protected
 */
DatabaseObjectLayer.prototype.layerFetchField = function(fieldName, callback) {
    // Ensure a valid callback is given
    if(!util.isFunction(callback))
        throw new Error('Missing callback function.');

    // Get the actual field through the fields getter
    this.layerFetchFields([fieldName], function(err, result) {
        // Handle errors
        if(err != null) {
            callback(err);
            return;
        }

        // Call back null if the result is null
        if(result === null) {
            callback(null, null);
            return;
        }

        // Call back the data
        callback(null, result[fieldName]);
    });
};

/**
 * Fetch the values for the given list of fields. Proper caching is handled automatically.
 *
 * The values will be fetched from all cache stacks it's available in, this is to reduce performance and processing time.
 * Fields fetched from the database are cached dynamically in the best suitable cache stack to improve performance for
 * later usage. The cache stack that is used will be determined by the head of the field within a given period of time.
 *
 * Data that is frequently requested and/or updated will have a great performance benefit. Fetching the data through
 * this method well be more than 10 times faster than a single database call for frequent usage.
 *
 * Cache stacks that are unavailable at the moment of execution will be ignored. If all cache stacks are offline,
 * we'll fall back to the database.
 *
 * @param {Array} fieldNames Array of field names to get.
 * @param {function} callback (err, {object} values) Callback with the values as object.
 *
 * @protected
 */
DatabaseObjectLayer.prototype.layerFetchFields = function(fieldNames, callback) {
    // Make sure the database field is configured
    if(!this.layerHasFields(fieldNames))
        throw new Error('Unknown database field, field is not configured!');

    // Store the current instance, create a callback latch and get the redis instance
    const instance = this;
    const redis = RedisUtils.getRedis();
    const callbackLatch = new SmartCallback();

    // Define the output object
    var out = {};

    // Add the given value to the output. The value will be parsed by the output parser automatically as configured
    var addOutput = function(fieldName, value) {
        // Get the output parser if configured, and parse the value
        const outputParser = instance._fieldConfig[fieldName].toOutput;
        if(outputParser != null)
            value = outputParser(value);

        // Add the value to the output
        out[fieldName] = value;
    };

    // Create a flag to determine whether to execute the generated database query
    var execDbQuery = false;

    // Create a list with translated database field names
    var dbFieldNames = [];
    var dbFindProjection = {};

    // Loop through all requested field names in parallel
    callbackLatch.add();
    async.forEachOf(fieldNames, function(fieldName, i, finishIteration) {
        // Get the custom field name if configured, use the same field name otherwise
        //noinspection JSUnresolvedVariable
        var dbFieldName = instance._fieldConfig[fieldName].field || fieldName;

        // Push the field name into the field names array
        dbFieldNames[i] = dbFieldName;

        // If the value is cached, add it to the output.
        // TODO: Should we also make this configurable, to ensure we aren't caching passwords?
        if(instance._localCache.hasCache(dbFieldName)) {
            // Add it to the output
            addOutput(fieldName, instance._localCache.layerGetLocalCache(dbFieldName));

            // Finish the iteration
            finishIteration();
            return;
        }

        // Check whether this field can be cached with Redis
        var cacheable = instance._fieldConfig[fieldName].cache;
        if(cacheable == undefined)
            cacheable = true;

        // Try to fetch the data from Redis cache if ready and if the field is cacheable
        if(cacheable && RedisUtils.isReady()) {
            // Add a callback
            callbackLatch.add();

            // Get the cached value if available
            // FIXME: Inspection: Private member is not accessible
            redis.get(instance._getCacheKeyField(dbFieldName), function(err, value) {
                // Handle errors
                if(err != undefined) {
                    // Print the error to the console
                    console.warn('Redis error: ' + err);

                    // Route the error
                    callback(err);
                    return;
                }

                // If the value isn't null, return it
                if(value != null) {
                    // Get the value through the cache getter if configured
                    const cacheGetter = instance._fieldConfig[fieldName].fromRedis;
                    if(cacheGetter != undefined)
                        value = cacheGetter(value);

                    // Add the value to the output
                    addOutput(fieldName, value);

                    // Resolve the callback
                    callbackLatch.resolve();
                    return;
                }

                // Unable to retrieve data from cache, get it form the database
                execDbQuery = dbFindProjection[dbFieldName] = true;

                // Resolve the callback
                callbackLatch.resolve();
            });

        } else
            // Add the field to the database find query
            execDbQuery = dbFindProjection[dbFieldName] = true;

        // Finish the iteration
        finishIteration();

    }, function() {
        // Resolve the callback
        callbackLatch.resolve();
    });

    // Wait for all cache reading, and query constructing callbacks to finish
    callbackLatch.then(function() {
        // Only execute a database query if a value has to be fetched from the database
        if(execDbQuery) {
            // Construct the find query
            //noinspection JSUnresolvedFunction
            const dbFindQuery = {
                _id: instance.getId()
            };

            // Execute the database query
            //noinspection JSUnresolvedVariable
            DatabaseObjectLayer.layerFetchFieldsFromDatabase(instance._dbCollectionName, dbFindQuery, dbFindProjection, function(err, result) {
                // Handle errors
                if(err != null) {
                    callback(err);
                    return;
                }

                // Make sure any was returned, if not callback null
                if(result.length == 0) {
                    callback(null, null);
                    return;
                }

                // Get the fetched data for this object
                var data = result[0];

                // Loop through all field names in parallel
                async.forEachOf(fieldNames, function(fieldName, i, finishIteration) {
                    // Get the database field name for this property
                    var dbFieldName = dbFieldNames[i];

                    // Get the raw database value
                    var value = data[dbFieldName];

                    // Parse it with the database parser if configured
                    const dbParser = instance._fieldConfig[fieldName].fromDb;
                    if(dbParser != null)
                        value = dbParser(value);

                    // Add the value to the output
                    addOutput(fieldName, value);

                    // TODO: Store the value in local cache?

                    // Check whether this field can be cached with Redis
                    var cacheable = instance._fieldConfig[fieldName].cache;
                    if(cacheable == undefined)
                        cacheable = true;

                    // Queue the field to be cached in Redis if Redis is ready
                    if(cacheable && RedisUtils.isReady()) {
                        // FIXME: Inspection: Private member is not accessible
                        DatabaseObjectLayer._LAYER_REDIS_CACHE_QUEUE.push({
                            value: value,
                            // FIXME: Inspection: Private member is not accessible
                            cacheKey: instance._getCacheKeyField(dbFieldName),
                            parserToRedis: instance._fieldConfig[fieldName].toRedis
                        });
                    }

                    // Finish the iteration
                    finishIteration();

                }, function() {
                    // Callback the output
                    callback(null, out);
                });
            });

        } else
            // Callback the output
            callback(null, out);
    });
};

/**
 * Check whether this database object configuration has the given field.
 *
 * @param {string} fieldName Field name.
 *
 * @returns {boolean} True if the given field is configured, false if not.
 *
 * @protected
 */
DatabaseObjectLayer.prototype.layerHasField = function(fieldName) {
    // Make sure the database field is configured
    //noinspection JSUnresolvedVariable
    return this._fieldConfig.hasOwnProperty(fieldName);
};

/**
 * Check whether this database object configuration has all the given fields.
 *
 * @param {Array} fieldNames Field names as strings.
 *
 * @returns {boolean} True if the object has all the field names, false otherwise.
 *
 * @protected
 */
DatabaseObjectLayer.prototype.layerHasFields = function(fieldNames) {
    // Store the current instance
    var instance = this;

    // Check whether all given fields exist, return the result (optimized code)
    return fieldNames.every(function(fieldName) {
        //noinspection JSUnresolvedVariable
        return instance._fieldConfig.hasOwnProperty(fieldName);
    });
};

/**
 * Do a find query on the database collection. Parse the result as an array through a callback.
 *
 * @param {string} collectionName Database collection name.
 * @param {object} query MongoDB query parameter.
 * @param {object} [projection] MongoDB projection parameter.
 * @param {function} callback (err, data) Callback.
 *
 * @protected
 */
// TODO: Move this to a global database objects class
DatabaseObjectLayer.layerFetchFieldsFromDatabase = function(collectionName, query, projection, callback) {
    // Get the database instance
    var db = MongoUtils.getConnection();

    // Return some user data
    db.collection(collectionName).find(query, projection).toArray(callback);
};

/**
 * Delete the document from the database collection. Parse the result as an array through a callback.
 *
 * @param {function} callback (err) Callback.
 *
 * @protected
 */
DatabaseObjectLayer.prototype.layerDeleteFromDatabase = function(callback) {
    // Get the database instance and store the current instance
    var db = MongoUtils.getConnection();
    var instance = this;

    // Construct the delete filter
    //noinspection JSUnresolvedFunction
    const deleteFilter = {
        _id: this.getId()
    };

    // Delete the document, call back the result
    //noinspection JSUnresolvedVariable
    db.collection(this._dbCollectionName).deleteOne(deleteFilter, function(err) {
        // Handle errors
        if(err != null) {
            callback(err);
            return;
        }

        // Remove all database object layer cache entries for this object
        if(RedisUtils.isReady()) {
            // Get the Redis instance
            const redis = RedisUtils.getRedis();

            // Find all keys for cached entries of this object
            redis.keys(instance._getCacheKeyRoot() + '*', function(err, keys) {
                // Try to flush all cache if an error occurred
                if(err != null) {
                    // Show a warning message
                    console.warn('Failed to remove cached Redis entries for deleted object, flushing everything in Redis as a security measure...');

                    // Flush all cache
                    //noinspection JSUnresolvedFunction
                    redis.flushall();
                    return;
                }

                // Loop through all keys
                async.each(keys, function(key, finishIteration) {
                    // Delete the key
                    redis.del(key);

                    // Finish the iteration
                    finishIteration();
                });
            });
        }

        // Call back
        callback(null);
    });
};

/**
 * Locally cache a database result for this object.
 *
 * @param {object} dbFields The database output as an object with keys and values.
 * @param {function} [callback] (err) Callback when done.
 *
 * @protected
 */
// TODO: Add option to cache with Redis?
DatabaseObjectLayer.prototype.layerCacheDatabaseResult = function(dbFields, callback) {
    // Store the current instance
    const instance = this;

    // Create a list of database fields
    var dbFieldNames = Object.keys(dbFields);

    // Define a list for regular field names, and fill it with null
    var fieldNames = [].fill(null);

    // Translate the database field names to regular field names
    async.forEachOf(dbFieldNames, function(dbFieldName, i, finishIteration) {
        // Check whether a configured key with this name exists
        if(instance._fieldConfig.hasOwnProperty(dbFieldName)) {
            // Get it's field
            const configFieldName = instance._fieldConfig[dbFieldName].field;

            // If the configured field is the same as the database field, put it in the field names list
            if(configFieldName == undefined || configFieldName === dbFieldName) {
                // Put it in the list
                fieldNames[i] = dbFieldName;

                // Finish this iteration
                finishIteration();
                return;
            }
        }

        // Define whether we've found the field
        var found = false;

        // Loop through all field configurations to compare it's database fields
        // TODO: Stop this if the key is found!
        async.forEachOf(instance._fieldConfig, function(field, key, finishIteration) {
            // Stop if we've found the key
            if(found) {
                // Finish the iteration and return
                finishIteration();
                return;
            }

            // Get the configured field
            const configDbFieldName = field.field;

            // If the configured database field name equals the requested field name, add it's regular field name to the list
            if(configDbFieldName === dbFieldName) {
                // Put it in the list
                fieldNames[i] = key;

                // We've found the field, set the flag to true
                found = true;
            }

            // Finish this iteration
            finishIteration();

        }, function() {
            // Finish the iteration of the parent for-each
            finishIteration();
        });

    }, function() {
        // We've successfully translated all field names
        // Loop through all field names in parallel
        async.forEachOf(fieldNames, function(fieldName, i, finishIteration) {
            // Make sure the current field isn't null
            if(fieldName == null) {
                // Finish the iteration and return
                finishIteration();
                return;
            }

            // Get the database field name for this property
            const dbFieldName = dbFieldNames[i];

            // Get the raw database value
            var value = dbFields[dbFieldName];

            // Parse it with the database parser if configured
            const dbParser = instance._fieldConfig[fieldName].fromDb;
            if(dbParser != null)
                value = dbParser(value);

            // Cache the field
            instance._localCache.setCache(dbFieldName, value);

            // // Queue the field to be cached in Redis if Redis is ready
            // if(RedisUtils.isReady()) {
            //     DatabaseObjectLayer._REDIS_CACHE_QUEUE.push({
            //         value: value,
            //         cacheKey: cacheKeyRoot + dbFieldName,
            //         parserToRedis: instance._dbFields[fieldName].toRedis
            //     });
            // }

            // Finish the iteration
            finishIteration();

        }, function() {
            // Call back
            if(callback != undefined)
                callback(null);
        });
    });
};

// Return the created class
module.exports = DatabaseObjectLayer;
