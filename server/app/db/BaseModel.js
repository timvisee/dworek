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
var _ = require('lodash');

var SmartCallback = require('../util/SmartCallback');
var ObjectCache = require('../cache/ObjectCache');
var MongoUtils = require('../mongo/MongoUtils');
var RedisUtils = require('../redis/RedisUtils');

/**
 * Time in seconds for a cached field to expire.
 * @type {number} Time in seconds.
 */
const CACHE_FIELD_EXPIRE = 60;

/**
 * Cache key prefix for database object layer instances.
 *
 * @type {string}
 */
const CACHE_KEY_PREFIX = 'model:';

/**
 * Constructor.
 *
 * @class
 * @constructor
 *
 * @param {Object} instance Model object instance.
 * @param {Object} modelConfig Field configuration for this object.
 */
var BaseModel = function(instance, modelConfig) {
    // Store the model instance
    /**
     * Model object instance.
     *
     * @type {Object}
     */
    this._instance = instance;

    // Store the model configuration
    /**
     * Model configuration.
     *
     * @type {Object} Model configuration.
     */
    this._modelConfig = modelConfig;

    // Configure the local object cache
    /**
     * Local object cache.
     *
     * @type {ObjectCache}
     */
    this._cache = new ObjectCache();
};

/**
 * Check whether cache for the given field is enabled.
 *
 * @param {string} field Field name.
 *
 * @return {boolean} True if enabled, false if not.
 */
BaseModel.prototype.cacheIsFieldEnabled = function(field) {
    // If configured, return whether cache is enabled
    if(_.has(this._modelConfig.fields, field + '.cache.enable'))
        return this._modelConfig.fields[field].cache.enable;

    // Cache not configured, return the default
    return true;
};

/**
 * Get a field from cache.
 *
 * @param {String} field Name of the field.
 *
 * @return {*} Field value, undefined is returned the field isn't cached.
 */
BaseModel.prototype.cacheGetField = function(field) {
    // Return undefined if cache is disabled for this field
    if(!this.cacheIsFieldEnabled(field))
        return undefined;

    // Get the field from cache
    var value = this._cache.getCache(field);

    // Check whether a conversion function is configured
    var hasConversionFunction = _.has(this._modelConfig.fields, field + '.cache.from');

    // Convert the value
    if(hasConversionFunction) {
        // Get the conversion function
        var conversionFunction = this._modelConfig.fields[field].cache.from;

        // Convert the value
        value = conversionFunction(value);
    }

    // Return the result value
    return value;
};


/**
 * Set a field in cache.
 * If cache is disabled for this field, the function will return immediately without actually storing the value in cache.
 *
 * @param {String} field Name of the field.
 * @param {*} value Field value.
 */
BaseModel.prototype.cacheSetField = function(field, value) {
    // Return if cache is disabled for this field
    if(!this.cacheIsFieldEnabled(field))
        return;

    // Check whether a conversion function is configured
    var hasConversionFunction = _.has(this._modelConfig.fields, field + '.cache.to');

    // Convert the value
    if(hasConversionFunction) {
        // Get the conversion function
        var conversionFunction = this._modelConfig.fields[field].cache.to;

        // Convert the value
        value = conversionFunction(value);
    }

    // Set the cache
    this._cache.setCache(field, value);
};

/**
 * Check whether the given field is cached.
 *
 * @param {String} field Field name.
 *
 * @return {boolean} True if the field is cached, false if not.
 */
BaseModel.prototype.cacheHasField = function(field) {
    // Return false if cache isn't enabled for this field
    if(!this.cacheIsFieldEnabled(field))
        return false;

    // Check whether this field is cached, return the result
    return this._cache.cacheHasField(field);
};

/**
 * Flush the cached fields.
 * If a field name is given, only that specific field is flushed.
 *
 * @param {String} [field=undefined] Name of the field to flush, undefined to flush all cache.
 */
BaseModel.prototype.cacheFlush = function(field) {
    this._cache.cacheFlush(field);
};











/**
 * Check whether Redis for the given field is enabled.
 *
 * @param {string} field Field name.
 *
 * @return {boolean} True if enabled, false if not.
 */
BaseModel.prototype.redisIsFieldEnabled = function(field) {
    // If configured, return whether cache is enabled
    if(_.has(this._modelConfig.fields, field + '.redis.enable'))
        return this._modelConfig.fields[field].redis.enable;

    // Redis not configured, return the default
    return true;
};

/**
 * Get the Redis root key for this model.
 *
 * @return {string} Redis root key.
 */
BaseModel.prototype.redisGetKeyRoot = function() {
    // TODO: Use the model type name here, instead of the database collection name
    return CACHE_KEY_PREFIX + this._modelConfig.db.collection + ':' + this._instance.getIdHex();
};

/**
 * Get the Redis key for the given field.
 *
 * @param {string} field Name of the field.
 *
 * @return {string} Redis key for the given field.
 */
BaseModel.prototype.redisGetKey = function(field) {
    return this.redisGetKeyRoot() + ':' + field;
};

/**
 * Get a field from Redis.
 *
 * @param {String} field Name of the field.
 * @param {function} callback Called when the value is fetched, or when an error occurred.
 */
BaseModel.prototype.redisGetField = function(field, callback) {
    // Return undefined if Redis is disabled for this field
    if(!this.redisIsFieldEnabled(field)) {
        callback(null, undefined);
        return;
    }

    // Get the Redis key
    var key = this.redisGetKey(field);

    // Get the Redis connection instance
    const redis = RedisUtils.getRedis();

    // Store the class instance
    const instance = this;

    // Fetch the value from Redis
    redis.get(key, function(err, value) {
        // Handle errors
        // TODO: Is it possible to only check for null, and not for undefined?
        if(err !== undefined && err !== null) {
            // Print the error to the console
            console.warn('Redis error: ' + err);

            // Route the error
            callback(err);
            return;
        }

        // Call back if the value is null
        if(value === null) {
            callback(null, value);
            return;
        }

        // Check whether a conversion function is configured
        var hasConversionFunction = _.has(instance._modelConfig.fields, field + '.redis.from');

        // Convert the value
        if(hasConversionFunction) {
            // Get the conversion function
            var conversionFunction = instance._modelConfig.fields[field].redis.from;

            // Convert the value
            value = conversionFunction(value);
        }

        // Call back the value
        callback(null, value);
    });
};


// Export the class
module.exports = BaseModel;
