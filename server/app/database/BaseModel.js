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

var async = require('async');
var _ = require('lodash');

var config = require('../../config');

var CallbackLatch = require('../util/CallbackLatch');
var ObjectCache = require('../cache/ObjectCache');
var MongoUtils = require('../mongo/MongoUtils');
var RedisUtils = require('../redis/RedisUtils');

/**
 * Cache key prefix for database object layer instances.
 *
 * @type {string}
 */
const CACHE_KEY_PREFIX = 'model:';

/**
 * The name of the Redis channel that is used to broadcast cache changes to
 * other worker threads. This to ensure all cache is up-to-date.
 */
const REDIS_CACHE_BROADCAST_CHANNEL_NAME = 'modelcache';

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
 * Get a model field.
 *
 * @param {String} field Field name.
 * @param {BaseModel~getFieldCallback} callback Called when the result is fetched, or when an error occurred.
 * @param {Object} [options] Options object (noCache).
 */
BaseModel.prototype.getField = function(field, callback, options) {
    // A call back must be given
    if(!_.isFunction(callback))
        throw new Error('A callback must be given');

    // Determine whether to use cache
    var useCache = true;
    if(options !== undefined && _.has(options, 'noCache'))
        useCache = !options.noCache;

    // Get the fields from cache
    var value;
    if(useCache)
        value = this.cacheGetField(field);

    // Call back the value if it isn't undefined
    if(value !== undefined) {
        callback(null, value);
        return;
    }

    // Store the current instance
    const self = this;

    // Create a callback latch
    var latch = new CallbackLatch();

    // Try to fetch the field from Redis if ready
    if(useCache && RedisUtils.isReady()) {
        // Add a latch and get the field
        latch.add();
        self.redisGetField(field, function(err, value) {
            // Show a console warning if an error occurred
            if(err !== null) {
                console.error('A Redis error occurred while fetching model data, falling back to MongoDB.');
                console.error(err.stack || err);

            } else if(value !== null) {
                // Call back the value if it isn't undefined, and if no error occurred
                // Set the fields in cache
                self.cacheSetField(field, value);

                // Call back
                callback(null, value);
                return;
            }

            // We're done, resolve the latch
            latch.resolve();
        });
    }

    // Get the field from MongoDB when ready
    latch.then(function() {
        // Reset the latch back to it's identity
        latch.identity();

        // Try to fetch the field from Mongo
        self.mongoGetField(field, function(err, value) {
            // Call back errors
            if(err !== null) {
                // Call back
                callback(err);
                return;
            }

            // Add a task to cache the values in Redis if ready
            if(RedisUtils.isReady()) {
                latch.add();
                self.redisSetField(field, value, function(err) {
                    if(err !== null) {
                        console.error('A Redis error occurred while caching model data, which will be ignored.');
                        console.error(err.stack || err);
                    }

                    // Resolve the latch
                    latch.resolve();
                });
            }

            // Cache the value
            self.cacheSetField(field, value);

            // Call back the value
            latch.then(function() {
                callback(null, value);
            });
        });
    });
};

/**
 * Called when the result is fetched, or when an error occurred.
 *
 * @callback BaseModel~getFieldCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {*=} Field value.
 */

/**
 * Get a list of model fields.
 *
 * @param {Array|String} fields Array of field names or a single field name.
 * @param {BaseModel~getFieldsCallback} callback Called when the result is fetched, or when an error occurred.
 * @param {Object} [options] Options object (noCache).
 */
BaseModel.prototype.getFields = function(fields, callback, options) {
    // A call back must be given
    if(!_.isFunction(callback))
        throw new Error('A callback must be given');

    // Check whether we can use cache
    var useCache = true;
    if(options !== undefined && _.has(options, 'noCache'))
        useCache = !options.noCache;

    // Get the fields from local cache and put it in the results object
    var results;
    if(useCache)
        results = this.cacheGetFields(fields);

    // Create an array of fields that still need to be fetched
    var fieldQueue = [];

    // Loop through the results object and add the fields that still need to be fetched to the array
    for(var field in results) {
        // Make sure the results object contains the field
        if(!results.hasOwnProperty(field))
            continue;

        // Add the field to the array if it's undefined
        if(results[field] === undefined)
            fieldQueue.push(field);
    }

    // Call back if the field queue is empty, since we successfully fetched all data
    if(fieldQueue.length === 0) {
        callback(null, results);
        return;
    }

    // Store the current instance
    const self = this;

    // Create a callback latch
    var latch = new CallbackLatch();

    // Try to fetch the fields from Redis if ready
    if(useCache && RedisUtils.isReady()) {
        latch.add();
        self.redisGetFields(fieldQueue, function(err, values) {
            // Show a console warning if an error occurred
            if(err !== null) {
                console.error('A Redis error occurred while fetching model data, falling back to MongoDB.');
                console.error(err.stack || err);

            } else {
                // Process the fetched fields. Put the values in the results object, and update the fieldQueue array
                // Clear the field queue array
                fieldQueue = [];

                // Loop through the result object
                for(var field in values) {
                    // Make sure values contains the field
                    if(!values.hasOwnProperty(field))
                        continue;

                    // Put the field in the results if it's fetched
                    if(values[field] !== null && values[field] !== undefined)
                        results[field] = values[field];

                    else
                        // Push the field in the fieldQueue array if it wasn't fetched
                        fieldQueue.push(field);
                }

                // Set the fields in cache
                self.cacheSetFields(values);
            }

            // Call back if the field queue is empty, since we successfully fetched all data
            if(fieldQueue.length === 0) {
                // Call back
                callback(null, results);
                return;
            }

            // Resolve the latch
            latch.resolve();
        });
    }

    // Try to fetch the field from Mongo when ready
    latch.then(function() {
        // Reset the latch to it's identity
        latch.identity();

        // Try to fetch the field from Mongo
        self.mongoGetFields(fieldQueue, function(err, values) {
            // Call back errors
            if(err !== null) {
                callback(err);
                return;
            }

            // Put the values in the results object
            for(var field in values) {
                // Make sure the values contain the field
                if(!values.hasOwnProperty(field))
                    continue;

                // Put the field in the results
                results[field] = values[field];
            }

            // Create a cache task to cache the values in Redis if ready
            if(RedisUtils.isReady()) {
                latch.add();
                self.redisSetFields(values, function(err) {
                    // Show a warning if an error occurred
                    if(err !== null) {
                        console.error('A Redis error occurred while caching model data, which will be ignored.');
                        console.error(err.stack || err);
                    }

                    // Resolve the latch
                    latch.resolve();
                });
            }

            // Set the fields in cache
            self.cacheSetFields(values);

            // Call back the results
            latch.then(function() {
                callback(null, results);
            });
        });
    });
};

/**
 * Called when the result is fetched, or when an error occurred.
 *
 * @callback BaseModel~getFieldsCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Object =} Object with field values.
 */

/**
 * Set a model field.
 *
 * @param {String} field Field name..
 * @param {*} value Field value.
 * @param {BaseModel~setFieldCallback} [callback] Called when the field is set, or when an error occurred.
 */
BaseModel.prototype.setField = function(field, value, callback) {
    // A call back must be given
    if(!_.isFunction(callback)) {
        console.error('ERROR: A callback must be given!');
        console.trace();

        // Set a placeholder callback
        callback = function(err) {
            if(err !== null)
                console.error(err.stack || err);
        };
    }

    // Create a callback latch to set the fields
    var latch = new CallbackLatch();

    // Store the current instance
    const self = this;

    // Set the field in MongoDB
    latch.add();
    this.mongoSetField(field, value, function(err) {
        // Call back if an error occurred
        if(err !== null) {
            callback(err);
            return;
        }

        // Resolve the latch
        latch.resolve();
    });

    // Set the field in Redis if ready
    if(RedisUtils.isReady()) {
        latch.add();
        self.redisSetField(field, value, function(err) {
            // Resolve the latch on success
            if(err === null) {
                latch.resolve();
                return;
            }

            // Show a warning
            console.error('A Redis error occurred while setting model data, flushing fields as fallback.');
            console.error(err.stack || err);

            // Flush the field as fallback
            self.redisFlush(field, function(err) {
                // Call back if an error occurred
                if(err !== null) {
                    // Show a warning
                    console.warn('Fallback flushing fields failed.');

                    // Call back the error
                    callback(err);
                    return;
                }

                // Resolve the latch
                latch.resolve();
            });
        });
    }

    // Set the field in the local object cache
    self.cacheSetField(field, value);

    // Call back if the latch is fully resolved
    latch.then(function() {
        callback(null);
    });
};

/**
 * Called when the field is set, or when an error occurred.
 *
 * @callback BaseModel~setFieldCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Set fields of a model.
 *
 * @param {Object} fields Object of fields and their values.
 * @param {BaseModel~setFieldsCallback} [callback] Called when the fields are set, or when an error occurred.
 */
BaseModel.prototype.setFields = function(fields, callback) {
    // A call back must be given
    if(!_.isFunction(callback)) {
        console.error('ERROR: A callback must be given!');
        console.trace();

        // Set a placeholder callback
        callback = function(err) {
            if(err !== null)
                console.error(err.stack || err);
        };
    }

    // Create a callback latch to set the fields
    var latch = new CallbackLatch();

    // Store the current instance
    const self = this;

    // Set the fields in MongoDB
    latch.add();
    this.mongoSetFields(fields, function(err) {
        // Call back if an error occurred
        if(err !== null) {
            callback(err);
            return;
        }

        // Resolve the latch
        latch.resolve();
    });

    // Set the fields in Redis if ready
    if(RedisUtils.isReady()) {
        latch.add();
        self.redisSetFields(fields, function(err) {
            // Resolve the latch on success
            if(err === null) {
                latch.resolve();
                return;
            }

            // Show a warning
            console.error('A Redis error occurred while setting model data, flushing fields as fallback.');
            console.error(err.stack || err);

            // Flush the field as fallback
            self.redisFlush(Object.keys(fields), function(err) {
                // Call back if an error occurred
                if(err !== null) {
                    // Show a warning
                    console.warn('Fallback flushing fields failed.');

                    // Call back the error
                    if(callback !== undefined)
                        callback(err);
                    else
                        throw err;
                    return;
                }

                // Resolve the latch
                latch.resolve();
            });
        });
    }

    // Set the field in the local object cache
    self.cacheSetFields(fields);

    // Call back if the latch is fully resolved
    latch.then(function() {
        callback(null);
    });
};

/**
 * Called when the fields are set, or when an error occurred.
 *
 * @callback BaseModel~setFieldsCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Check whether a field is available.
 *
 * @param {string} field Field name.
 * @param {BaseModel~hasFieldCallback} callback Called when the result is fetched, or when an error occurred.
 */
BaseModel.prototype.hasField = function(field, callback) {
    // Check whether the field is available in local cache
    if(this.cacheHasField(field)) {
        callback(null, true);
        return;
    }

    // Create a callback latch
    var latch = new CallbackLatch();

    // Check in MongoDB
    latch.add();
    this.mongoHasField(field, function(err, result) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Call back if the result is true
        if(result) {
            callback(null, true);
            return;
        }

        // Resolve the latch
        latch.resolve();
    });

    // Check in Redis if ready
    if(RedisUtils.isReady()) {
        latch.add();
        this.redisHasField(field, function(err, result) {
            // Show a warning if an error occurred
            if(err !== null) {
                // Show the warning
                console.error('A Redis error occurred while checking if a model field is cached, falling back to MongoDB.');
                console.error(err.stack || err);

            } else if(result === true) {
                // Call back if the result is true
                callback(null, true);
                return;
            }

            // Resolve the latch
            latch.resolve();
        });
    }

    // If the latch is resolved, call back false. If true was called back it wouldn't reach this point
    latch.then(() => callback(null, false));
};

/**
 * Called when the result is fetched, or when an error occurred
 *
 * @callback BaseModel~hasFieldCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean=} True if the field exists, false if not.
 */

/**
 * Check whether the given model fields are available.
 *
 * @param {Array|string} fields Array of field names or a single field name.
 * @param {BaseModel~hasFieldsCallback} callback Called when the result is fetched, or when an error occurred.
 */
BaseModel.prototype.hasFields = function(fields, callback) {
    // Check the fields all together in all storage systems first
    // Check whether the field is available in local cache
    if(this.cacheHasFields(fields)) {
        callback(null, true);
        return;
    }

    // Create a callback latch
    var latch = new CallbackLatch();

    // Make sure we only call back once
    var calledBack = false;

    // Check in MongoDB
    latch.add();
    this.mongoHasFields(fields, function(err, result) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Call back if the result is true
        if(result) {
            if(!calledBack)
                callback(null, true);
            calledBack = true;
            return;
        }

        // Resolve the latch
        latch.resolve();
    });

    // Check in Redis if ready
    if(RedisUtils.isReady()) {
        latch.add();
        this.redisHasFields(fields, function(err, result) {
            // Show a warning if an error occurred
            if(err !== null) {
                // Show the warning
                console.error('A Redis error occurred while checking if a model field is cached, falling back to MongoDB.');
                console.error(err.stack || err);

            } else if(result === true) {
                // Call back if the result is true
                callback(null, true);
                return;
            }

            // Resolve the latch
            latch.resolve();
        });
    }

    // Store the current instance
    const self = this;

    // Check all fields one by one on all storage systems if the previous checks failed
    latch.then(function() {
        // Create a result variable
        var result = true;

        // Create an array of tasks
        var tasks = [];

        // Loop through the fields and create the proper tasks
        fields.forEach(function(field) {
            // Create a local object cache task
            tasks.push(function(completeTask) {
                // Skip the task if the result is set to false
                if(result === false)
                    return;

                // Check whether the field exists
                var exists = self.cacheHasField(field);

                // Process the result if the result is false
                if(exists === false) {
                    // Set the result flag
                    result = false;

                    // Call back
                    if(!calledBack)
                        callback(null, false);
                    calledBack = true;
                }

                // Complete the task
                completeTask(null, exists);
            });

            // Create a Redis task if ready
            if(RedisUtils.isReady()) {
                tasks.push(function(completeTask) {
                    // Skip the task if the result is set to false
                    if(result === false)
                        return;

                    // Check whether the field exists in Redis
                    self.redisHasField(field, function(err, exists) {
                        // Show a warning if Redis failed
                        if(err !== null) {
                            console.error('A Redis error occurred while checking if a model field exists, falling back.');
                            console.error(err.stack || err);

                        } else {
                            // Process the result if the result is false
                            if(exists === false) {
                                // Set the result flag
                                result = false;

                                // Call back
                                if(!calledBack)
                                    callback(null, false);
                                calledBack = true;
                            }
                        }

                        // Complete the task
                        completeTask(null, exists && err !== null);
                    });
                });
            }

            // Create a MongoDB task
            tasks.push(function(completeTask) {
                // Skip the task if the result is set to false
                if(result === false)
                    return;

                // Check whether the field exists in MongoDB
                self.mongoHasField(field, function(err, exists) {
                    // Call back errors
                    if(err !== null) {
                        completeTask(err, false);
                        return;
                    }

                    // Process the result if the result is false
                    if(exists === false) {
                        // Set the result flag
                        result = false;

                        // Call back
                        if(!calledBack)
                            callback(null, false);
                        calledBack = true;
                    }

                    // Complete the task
                    completeTask(null, exists);
                });
            });
        });

        // Invoke the tasks
        //noinspection JSUnusedLocalSymbols
        async.parallelLimit(tasks, 6, function(err, results) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Return if the result is false, because that means we already called back
            if(result === false)
                return;

            // Call back true, everything seems to exist
            if(!calledBack)
                callback(null, true);
            calledBack = true;
        });
    });
};

/**
 * Called when the result is fetched, or when an error occurred
 *
 * @callback BaseModel~hasFieldsCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean=} True if all the given fields exist, false otherwise.
 */

/**
 * Flush the model. This flushes all storage systems for this model, also the persistent storage systems.
 * If no specific fields are given, all fields are flushed for the model.
 *
 * @param {Array|string|undefined} fields An array of field names or a specific field name to flush those fields.
 * Undefined to flush all fields.
 * @param {BaseModel~flushCallback} [callback] Called when the data is flushed, or when an error occurred.
 */
BaseModel.prototype.flush = function(fields, callback) {
    // Store the current instance
    const self = this;

    // Flush the cache and MongoDB, call back when we're done
    async.parallel([
        (completeTask) => self.flushCache(fields, completeTask),
        (completeTask) => self.mongoFlush(fields, completeTask)
    ], function(err) {
        if(callback !== undefined)
            callback(err);
        else
            throw err;
    });
};

/**
 * Called when the data is flushed, or when an error occurred.
 *
 * @callback BaseModel~flushCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Flush the model cache. This flushes all non-persistent storage systems for this model.
 * If no specific fields are given, all fields are flushed for the model.
 *
 * @param {Array|string|undefined} fields An array of field names or a specific field name to flush those fields.
 * Undefined to flush all fields.
 * @param {BaseModel~flushCacheCallback} [callback] Called when the data is flushed, or when an error occurred.
 */
BaseModel.prototype.flushCache = function(fields, callback) {
    // Flush the Redis cache if ready, call back otherwise
    if(RedisUtils.isReady())
        this.redisFlush(fields, callback);
    else if(callback !== undefined)
        callback(null);

    // Flush the local object cache
    this.cacheFlush(fields);
};

/**
 * Called when the data is flushed, or when an error occurred.
 *
 * @callback BaseModel~flushCacheCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Get a field from MongoDB.
 *
 * @param {String} field Name of the field.
 * @param {BaseModel~mongoGetFieldCallback} callback Called when the data is fetched from MongoDB, or when an error occurred.
 */
BaseModel.prototype.mongoGetField = function(field, callback) {
    // Get the field through the bulk function
    this.mongoGetFields(field, function(err, data) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Call back if undefined
        if(data === undefined) {
            callback(new Error('Received data is undefined, query might have returned nothing'), undefined);
            return;
        }

        // Call back with the field value
        callback(null, data[field]);
    });
};

/**
 * Called when the data is fetched from MongoDB, or when an error occurred.
 *
 * @callback BaseModel~mongoGetFieldCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 * @param {*=} Fetched field value.
 */

/**
 * Get a list of fields from MongoDB.
 *
 * @param {Array|String} fields Array of field names to get.
 * @param {BaseModel~mongoGetFieldsCallback} callback Called when the data is fetched from MongoDB, or when an error occurred.
 */
BaseModel.prototype.mongoGetFields = function(fields, callback) {
    // Get the MongoDB connection instance
    const mongo = MongoUtils.getConnection();

    // Store the class instance
    const self = this;

    // Convert the fields parameter to an array
    if(!Array.isArray(fields))
        fields = [fields];

    // Create a list of field name translations to MongoDB
    var mongoFields = {};
    fields.forEach(function(field) {
        // Get the MongoDB field name and add it to the array, use the field name if nothing is configured
        if(_.has(self._modelConfig.fields, fields + '.mongo.field'))
            mongoFields[field] = self._modelConfig.fields[fields].mongo.field || fields;
        else
            mongoFields[field] = field;
    });

    // Create the query object
    var queryObject = {
        _id: this._instance.getId()
    };

    // Create the projection object
    var projectionObject = {};
    for(var field in mongoFields)
        // Make sure the object owns the key
        if(fields.hasOwnProperty(field))
            projectionObject[mongoFields[field]] = true;

    // Create a results object
    var results = {};

    // Make sure we only call back once
    var calledBack = false;

    // Fetch the field from MongoDB
    mongo.collection(this._modelConfig.mongo.collection).find(queryObject, projectionObject).toArray(function(err, reply) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(new Error(err), undefined);
            calledBack = true;
            return;
        }

        // Call back undefined if no results were found
        if(reply.length === 0) {
            if(!calledBack)
                callback(null, undefined);
            calledBack = true;
            return;
        }

        // Get the data object
        var data = reply[0];

        // Loop through the fields, convert it's values and add it to the result object
        for(var field in mongoFields) {
            // Get the value for the mongo field
            var value = data[mongoFields[field]];

            // Convert the value
            if(_.has(self._modelConfig.fields, fields + '.mongo.from'))
                // Convert the value
                value = self._modelConfig.fields[fields].mongo.from(value);

            // Add the value to the results object
            results[field] = value;
        }

        // Call back with the result
        if(!calledBack)
            callback(null, results);
        calledBack = true;
    });
};

/**
 * Called when the data is fetched from MongoDB, or when an error occurred.
 *
 * @callback BaseModel~mongoGetFieldsCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 * @param {Object} Object with field values.
 */

/**
 * Set a field in MongoDB.
 *
 * @param {String} field Name of the field.
 * @param {*} value Field value.
 * @param {BaseModel~mongoSetFieldCallback} [callback] Called when the value is set, or if an error occurred.
 */
BaseModel.prototype.mongoSetField = function(field, value, callback) {
    // Set the field through the bulk function
    this.mongoSetFields({
        [field]: value
    }, callback);
};

/**
 * Called when the value is set, or if an error occurred.
 *
 * @callback BaseModel~mongoSetFieldCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Set a list of fields in MongoDB.
 *
 * @param {Object} fields Object with fields and values to set.
 * @param {BaseModel~mongoSetFieldsCallback} [callback] Called when the values are set, or when an error occurred.
 */
BaseModel.prototype.mongoSetFields = function(fields, callback) {
    // A call back must be given
    if(!_.isFunction(callback))
        throw new Error('A callback must be given');

    // Get the MongoDB connection instance
    const mongo = MongoUtils.getConnection();

    // Create a data object
    var data = {};

    // Loop through the fields, convert them to MongoDB fields and convert their values
    for(var field in fields) {
        // Make sure the object owns the key
        if(!fields.hasOwnProperty(field))
            continue;

        // Get the value
        var value = fields[field];

        // Skip undefined values
        if(value === undefined)
            continue;

        // Get the MongoDB field name
        var mongoField = field;
        if(_.has(this._modelConfig.fields, field + '.mongo.field'))
            mongoField = this._modelConfig.fields[field].mongo.field || field;

        // Convert the value
        if(_.has(this._modelConfig.fields, field + '.mongo.to'))
            // Convert the value
            value = this._modelConfig.fields[field].mongo.to(value);

        // Add the value to the data object
        data[mongoField] = value;
    }

    // Call back if the object doesn't contain any keys
    if(Object.keys(data).length === 0) {
        // Call back
        callback(new Error('Trying to set fields in MongoDb, but no fields are given'));
        return;
    }

    // Create the query object
    var queryObject = {
        _id: this._instance.getId()
    };

    // Create the update object
    var updateObject = {
        $set: data
    };

    // Fetch the field from MongoDB
    mongo.collection(this._modelConfig.mongo.collection).updateOne(queryObject, updateObject, function(err, result) {
        // Call back errors
        if(err !== null) {
            // Call back the error
            callback(new Error(err));
            return;
        }

        // Make sure the result object is valid
        if(!_.isObject(result) || !_.has(result, 'result') || result.result.ok !== 1) {
            console.error(result);
            callback(new Error('Failed to update fields in MongoDb, result object is invalid'));
            return;
        }

        // The result must be one, as one row must be updated
        if(result.result.nModified !== 1) {
            // Call back the error
            callback(new Error('No rows were updated in MongoDb'));
            return;
        }

        // Call back with success
        callback(null);
    });
};

/**
 * Called when the values are set, or when an error occurred.
 *
 * @callback BaseModel~mongoSetFieldsCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Check whether the given field is in MongoDB.
 *
 * @param {String} field Field name.
 * @param {BaseModel~mongoHasFieldCallback} callback Called with the result, or when an error occurred.
 */
BaseModel.prototype.mongoHasField = function(field, callback) {
    // Get the result through the bulk function
    this.mongoHasFields(field, callback);
};

/**
 * Called with the result, or when an error occurred.
 *
 * @callback BaseModel~mongoHasFieldCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean} True if the field exists, false if not.
 */

/**
 * TODO: Untested function.
 *
 * Check whether the given fields are in MongoDB.
 *
 * @param {Array|String} fields List of field names, or a single field name.
 * @param {BaseModel~mongoHasFieldsCallback} callback Called with the result, or when an error occurred.
 */
BaseModel.prototype.mongoHasFields = function(fields, callback) {
    // Get the MongoDB connection instance
    const mongo = MongoUtils.getConnection();

    // Store the current instance
    const self = this;

    // Convert the fields parameter to an array
    if(!Array.isArray(fields))
        fields = [fields];

    // Create a list of field name translations to MongoDB
    var mongoFields = {};
    fields.forEach(function(field) {
        // Get the MongoDB field name and add it to the array, use the field name if nothing is configured
        if(_.has(self._modelConfig.fields, fields + '.mongo.field'))
            mongoFields[field] = self._modelConfig.fields[fields].mongo.field || fields;
        else
            mongoFields[field] = field;
    });

    // Create the query object
    var queryObject = {
        _id: this._instance.getId()
    };

    // Add the fields to the query object
    for(var field in mongoFields)
        queryObject[mongoFields[field]] = {
            $exists: true
        };

    // Create the projection object
    var projectionObject = {
        _id: true
    };

    // Fetch the field from MongoDB
    mongo.collection(this._modelConfig.mongo.collection).find(queryObject, projectionObject).toArray(function(err, data) {
        // Call back errors
        if(err !== null) {
            callback(new Error(err), false);
            return;
        }

        // Determine and return the result
        callback(null, data.length > 0);
    });
};

/**
 * Called with the result, or when an error occurred.
 *
 * @callback BaseModel~mongoHasFieldsCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean} True if all the fields exist in MongoDB, false otherwise.
 */

/**
 * TODO: Untested function.
 *
 * Flush fields from MongoDB.
 * If field names are given, only those specific fields are flushed if they exists.
 *
 * @param {Array|String} [fields=undefined] Array of field names or name of the field to flush, undefined to flush all the fields.
 * @param {BaseModel~mongoFlushCallback} [callback] Called on success, or when an error occurred.
 */
BaseModel.prototype.mongoFlush = function(fields, callback) {
    // Get the MongoDB connection instance
    const mongo = MongoUtils.getConnection();

    // Create the query object
    var queryObject = {
        _id: this._instance.getId()
    };

    // Check whether to delete the whole document for this model object
    if(fields === undefined || (Array.isArray(fields) && fields.length === 0)) {
        // Delete the document
        // Delete the document from MongoDB
        mongo.collection(this._modelConfig.mongo.collection).deleteOne(queryObject, function(err) {
            // Call back errors
            if(err !== null) {
                // Encapsulate the error
                const error = new Error(err);

                // Call back or throw the error
                if(callback !== undefined)
                    callback(error);
                else
                    throw error;
                return;
            }

            // Call back with success
            if(callback !== undefined)
                callback(null);
        });

        return;
    }

    // Delete a specific field
    // Convert the fields to an array if it's a string
    fields = [fields];

    // Store this instance
    const self = this;

    // Create a list of field name translations to MongoDB
    var mongoFields = {};
    fields.forEach(function(field) {
        // Get the MongoDB field name and add it to the array, use the field name if nothing is configured
        if(_.has(self._modelConfig.fields, fields + '.mongo.field'))
            mongoFields[field] = self._modelConfig.fields[fields].mongo.field || fields;
        else
            mongoFields[field] = field;
    });

    // Create an object of fields to update
    var updateFieldsObject = {};
    for(var field in mongoFields)
        // Make sure the object owns the key
        if(mongoFields.hasOwnProperty(field))
            updateFieldsObject[mongoFields[field]] = '';

    // Create the update object
    var updateObject = {
        $unset: updateFieldsObject
    };

    // Delete the field from MongoDB
    mongo.collection(this._modelConfig.mongo.collection).updateOne(queryObject, updateObject, function(err) {
        // Call back errors
        if(err !== null) {
            // Encapsulate the error
            const error = new Error(err);

            // Call back or throw the error
            if(callback !== undefined)
                callback(error);
            else
                throw error;
            return;
        }

        // Call back with success
        if(callback !== undefined)
            callback(null);
    });
};

/**
 * Called on success, or when an error occurred.
 *
 * @callback BaseModel~mongoFlushCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

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
 * Check whether cache is enabled for the given fields.
 *
 * @param {Array|String} fields Array of field names, or a single field name as a string.
 *
 * @return {boolean} True if all fields are enabled, false otherwise.
 */
BaseModel.prototype.cacheAreFieldsEnabled = function(fields) {
    // Convert the fields parameter to an array if it isn't an array
    if(!Array.isArray(fields))
        fields = [fields];

    // Loop through all the fields, check whether cache is enabled
    for(var i = 0, fieldCount = fields.length; i < fieldCount; i++)
        // Cache must be enabled for this field, if it's configured. Return false if that's not the case
        if(!this.cacheIsFieldEnabled(fields[i]))
            return false;

    // Cache seems to be enabled for all fields, return true
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
    // Get and return the field through the bulk function
    return this.cacheGetFields(field)[field];
};

/**
 * Get a list of fields from cache.
 *
 * @param {Array|String} fields List of the field names or a single field name to get from cache.
 *
 * @return {Object} Object with the fields and values.
 * Values will be undefined if they aren't available in cache or if cache is disabled for that specific field.
 */
BaseModel.prototype.cacheGetFields = function(fields) {
    // Create a results object
    var results = {};

    // Convert the fields parameter to an array
    if(!Array.isArray(fields))
        fields = [fields];

    // Store this
    const self = this;

    // Loop through all the fields, fetch and convert their value and add it to the results object
    fields.forEach(function(field) {
        // Make sure internal caching is enabled and that the field itself is enabled
        if(!config.cache.enable || !self.cacheIsFieldEnabled(field)) {
            results[field] = undefined;
            return;
        }

        // Get the field from cache
        var value = self._cache.getCache(field);

        // Convert the value
        if(_.has(self._modelConfig.fields, field + '.cache.from'))
            // Convert the value
            value = self._modelConfig.fields[field].cache.from(value);

        // Add the value to the results object
        results[field] = value;
    });

    // Return the result object
    return results;
};

/**
 * Set a field in cache.
 * If cache is disabled for this field, the function will return immediately without actually storing the value in cache.
 *
 * @param {String} field Name of the field.
 * @param {*} value Field value.
 */
BaseModel.prototype.cacheSetField = function(field, value) {
    // Set the field through the bulk function
    this.cacheSetFields({
        [field]: value
    });
};

/**
 * Set a list of fields in cache.
 * A given field value won't be stored in cache if cache is disabled for that specific field.
 *
 * @param {Object} fields Object containing the field names as keys, and the values as their values.
 */
BaseModel.prototype.cacheSetFields = function(fields) {
    // Return when internal cache is disabled
    if(!config.cache.enable)
        return;

    // Create an object with the cache values to set
    var cacheObject = {};

    // Loop through the fields
    for(var field in fields) {
        // Make sure the object owns the key
        if(!fields.hasOwnProperty(field))
            continue;

        // Get the field value
        var value = fields[field];

        // Skip if the value is undefined
        if(value === undefined)
            continue;

        // Return if cache is disabled for this field
        if(!this.cacheIsFieldEnabled(field))
            continue;

        // Convert the value
        if(_.has(this._modelConfig.fields, field + '.cache.to'))
            // Convert the value
            value = this._modelConfig.fields[field].cache.to(value);

        // Add the value to the cache object
        cacheObject[field] = value;
    }

    // Push the cache object to the object's cache
    this._cache.setCacheMultiple(cacheObject);

    // TODO: Push a message to the master thread using process.send(data)
    // TODO: Push a message through Redis to update the internal cache in other worker threads.
};

/**
 * Check whether the given field is cached.
 *
 * @param {String} field Field name.
 *
 * @return {boolean} True if the field is cached, false if not.
 */
BaseModel.prototype.cacheHasField = function(field) {
    // Get and return the field result the bulk function
    return this.cacheHasFields(field);
};

/**
 * Check whether the list of given fields are cached.
 *
 * @param {Array|String} fields List of fields, or a single field name.
 *
 * @return {boolean} True if all given fields are cached, false otherwise.
 */
BaseModel.prototype.cacheHasFields = function(fields) {
    // Return false if internal cache is disabled
    if(!config.cache.enabled)
        return false;

    // Convert the fields parameter to an array
    if(!Array.isArray(fields))
        fields = [fields];

    // Return false if cache isn't enabled for any of the fields
    if(!this.cacheAreFieldsEnabled(fields))
        return false;

    // Loop through all the fields, make sure cache is enabled
    for(var i = 0, fieldCount = fields.length; i < fieldCount; i++)
        if(!this._cache.hasCache(fields[i]))
            return false;

    // All fields seem to be cached, return true
    return true;
};

/**
 * Flush the cached fields.
 * If field names are given, only those specific fields will be flushed.
 *
 * @param {Array|String} [fields=undefined] An array with field names or a specific field name to flush, undefined to flush all cache.
 */
// TODO: Add a property to define whether to flush cache in other worker threads, or just in this thread.
BaseModel.prototype.cacheFlush = function(fields) {
    // Return if internal cache is diabled
    if(!config.cache.enable)
        return false;

    // Flush the cache
    this._cache.flushCache(fields);

    // TODO: Flush all cache in other worker threads!
};

/**
 * Check whether Redis for the given field is enabled.
 *
 * @param {string} field Field name.
 *
 * @return {boolean} True if enabled, false if not.
 */
BaseModel.prototype.redisIsFieldEnabled = function(field) {
    // Return false if Redis isn't ready
    if(!RedisUtils.isReady())
        return false;

    // If configured, return whether cache is enabled
    if(_.has(this._modelConfig.fields, field + '.redis.enable'))
        return this._modelConfig.fields[field].redis.enable;

    // Redis not configured, return the default
    return true;
};

/**
 * Check whether Redis is enabled for the given fields.
 *
 * @param {Array|string} fields Array of field names, or a single field name as a string.
 *
 * @return {boolean} True if all fields are enabled, false otherwise.
 */
BaseModel.prototype.redisAreFieldsEnabled = function(fields) {
    // Return false if Redis isn't ready
    if(!RedisUtils.isReady())
        return false;

    // Convert the fields parameter to an array if it isn't an array
    if(!Array.isArray(fields))
        fields = [fields];

    // Loop through all the fields, check whether Redis is enabled
    for(var i = 0, fieldCount = fields.length; i < fieldCount; i++)
        // Redis must be enabled for this field, if it´s configured. Return false if that's not the case
        if(this.redisIsFieldEnabled(fields[i]))
            return false;

    // Redis seems to be enabled for all fields, return true
    return true;
};

/**
 * Get the Redis root key for this model.
 *
 * @return {string} Redis root key.
 */
BaseModel.prototype.redisGetKeyRoot = function() {
    // TODO: Use the model type name here, instead of the database collection name
    return CACHE_KEY_PREFIX + this._modelConfig.mongo.collection + ':' + this._instance.getIdHex();
};

/**
 * Get the Redis key for the given field.
 *
 * @param {string} field Name of the field.
 *
 * @return {string} Redis key for the given field.
 */
BaseModel.prototype.redisGetKey = function(field) {
    return this.redisGetKeyRoot() + ':fields:' + field;
};

/**
 * Get the Redis keys for the given fields.
 *
 * @param {Array|string} fields Array of field names, or the name of a single field.
 *
 * @return {Object} Object with the Redis keys for the given fields, with the field name as key and the Redis key as value.
 */
BaseModel.prototype.redisGetKeys = function(fields) {
    // Convert the fields parameter to an array
    if(!Array.isArray(fields))
        fields = [fields];

    // Create a results object
    var results = {};

    // Store the current instance
    const self = this;

    // Loop through the list of fields
    fields.forEach(function(field) {
        results[field] = self.redisGetKey(field);
    });

    // Return the results
    return results;
};

/**
 * Get a field from Redis.
 *
 * @param {String} field Name of the field.
 * @param {BaseModel~redisGetFieldCallback} callback Called when the value is fetched, or when an error occurred.
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
    const redis = RedisUtils.getConnection();

    // Store the class instance
    const self = this;

    // Fetch the value from Redis
    redis.get(key, function(err, value) {
        // Handle errors
        // TODO: Is it possible to only check for null, and not for undefined?
        if(err !== undefined && err !== null) {
            // Print the error to the console
            console.warn('Redis error: ' + err);

            // Route the error
            callback(new Error(err));
            return;
        }

        // Call back if the value is null
        if(value === null) {
            callback(null, value);
            return;
        }

        // Convert the value
        if(_.has(self._modelConfig.fields, field + '.redis.from'))
            // Convert the value
            value = self._modelConfig.fields[field].redis.from(value);

        // Call back the value
        callback(null, value);
    });
};

/**
 * Called when the field is fetched from Redis, or when an error occurred.
 *
 * @callback BaseModel~redisGetFieldCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 * @param {*=} Field value, or undefined if Redis is disabled for the given field.
 */

/**
 * Get a list of fields from Redis.
 *
 * @param {Array|String} fields Array of field names or a single field name to get.
 * @param {BaseModel~redisGetFieldsCallback} callback Called when the data is fetched from Redis, or when an error occurred.
 */
BaseModel.prototype.redisGetFields = function(fields, callback) {
    // Call back if Redis isn't ready
    if(!RedisUtils.isReady()) {
        callback(null);
        return;
    }

    // Get the Redis connection instance
    const redis = RedisUtils.getConnection();

    // Store the class instance
    const self = this;

    // Create a results object
    var results = {};

    // Convert the fields parameter to an array
    if(!Array.isArray(fields))
        fields = [fields];

    // Create a list of field names and Redis keys to fetch
    var redisFields = [];
    var redisKeys = [];
    fields.forEach(function(field) {
        // Make sure Redis is enabled for this field, add it as undefined to the results object if not
        if(!self.redisIsFieldEnabled(field)) {
            results[field] = undefined;
            return;
        }

        // Get the key, and add it to the redis keys array
        redisFields.push(field);
        redisKeys.push(self.redisGetKey(field));
    });

    // Create a callback latch
    var latch = new CallbackLatch();

    // Check whether there are enough keys to fetch from cache
    if(redisKeys.length > 0) {
        // Add a latch for the Redis command
        latch.add();

        // Fetch the values from Redis
        redis.mget(redisKeys, function(err, reply) {
            // Handle errors
            // TODO: Is it possible to only check for null, and not for undefined?
            if(err !== undefined && err !== null) {
                // Print the error to the console
                console.warn('Redis error: ' + err);

                // Route the error
                callback(new Error(err));
                return;
            }

            // Call back if the value is null
            if(reply === null) {
                callback(new Error('Failed to fetch model fields from Redis.'));
                return;
            }

            // Make sure the reply is an array
            if(!Array.isArray(reply)) {
                callback(new Error('Got invalid reply data from Redis, should be an array.'));
                return;
            }

            // Loop through the fetched values
            for(var i = 0, length = reply.length; i < length; i++) {
                // Get the field and value
                var value = reply[i];
                var field = redisFields[i];

                // Convert the value
                if(_.has(self._modelConfig.fields, field + '.redis.from'))
                    // Convert the value
                    reply = self._modelConfig.fields[field].redis.from(reply);

                // Push the result in the results object
                results[field] = value;
            }

            // Resolve the latch
            latch.resolve();
        });
    }

    // Call back when we're done
    latch.then(function() {
        // Call back with the results
        callback(null, results);
    });
};

/**
 * Called when the data is fetched from Redis, or when an error occurred.
 *
 * @callback BaseModel~redisGetFieldsCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 * @param {Object=} Object with field values. Values that cache is disabled for, are set to undefined.
 */

/**
 * Set a field value in Redis.
 * The field won't be set if Redis is disabled for this field, the success callback is called in that case.
 *
 * @param {string} field Name of the field.
 * @param {*} value Value of the field.
 * @param {BaseModel~redisSetFieldCallback} [callback] Called when the value is set, or when an error occurred.
 */
BaseModel.prototype.redisSetField = function(field, value, callback) {
    // Call back if Redis isn't ready
    if(!RedisUtils.isReady()) {
        if(callback !== undefined)
            callback(null);
        return;
    }

    // Skip if the value is undefined
    if(value === undefined) {
        // Call back and return
        if(callback !== undefined)
            callback(null);
        return;
    }

    // Return undefined if Redis is disabled for this field
    if(!this.redisIsFieldEnabled(field)) {
        if(callback !== undefined)
            callback(null);
        return;
    }

    // Get the Redis key
    var key = this.redisGetKey(field);

    // Get the Redis connection instance
    const redis = RedisUtils.getConnection();

    // Convert the value
    if(_.has(this._modelConfig.fields, field + '.redis.to'))
        // Convert the value
        value = this._modelConfig.fields[field].redis.to(value);

    // Set the field and it's TTL
    redis.setex(key, config.redis.cacheExpire, value, function(err) {
        // Call back if an error occurred
        if(err !== null) {
            // Encapsulate the error
            const error = new Error(err);

            // Call back or throw the error
            if(callback !== undefined)
                callback(error);
            else
                throw error;
            return;
        }

        // Call back
        if(callback !== undefined)
            callback(null);
    });
};

/**
 * Called when the value is set, or when an error occurred.
 *
 * @callback BaseModel~redisSetFieldCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Set a list of fields in Redis.
 * A field won't be set if Redis is disabled for that specific field.
 *
 * @param {Object} fields Object with the fields and values to set.
 * @param {BaseModel~redisSetFieldsCallback} [callback] Called when the values are set, or when an error occurred.
 */
BaseModel.prototype.redisSetFields = function(fields, callback) {
    // Call back if Redis isn't ready
    if(!RedisUtils.isReady()) {
        if(callback !== undefined)
            callback(null);
        return;
    }

    // Get the Redis connection instance
    const redis = RedisUtils.getConnection();

    // Create an array of Redis data (sequences of key name and data)
    var redisData = [];

    // Loop through the fields
    for(var field in fields) {
        // Make sure the object owns this field
        if(!fields.hasOwnProperty(field))
            continue;

        // Get the value
        var value = fields[field];

        // Skip undefined values
        if(value === undefined)
            continue;

        // Make sure Redis is enabled for this field
        if(!this.redisIsFieldEnabled(field))
            continue;

        // Convert the value
        if(_.has(this._modelConfig.fields, field + '.redis.to'))
            // Convert the value
            value = this._modelConfig.fields[field].redis.to(value);

        // Get and add the Redis key and value to the redis data array
        redisData.push(this.redisGetKey(field));
        redisData.push(value);
;   }

    // Call back if the Redis data array is empty
    if(redisData.length === 0) {
        // Call back
        if(callback !== undefined)
            callback(null);
        return;
    }

    // Set the Redis data
    redis.mset(redisData, function(err) {
        // Call back if an error occurred
        if(err !== null) {
            // Encapsulate the error
            const error = new Error(err);

            // Call back or throw the error
            if(callback !== undefined)
                callback(error);
            else
                throw error;
            return;
        }

        // Create a callback latch for the expire commands
        var latch = new CallbackLatch();

        // Keep track of errors
        var commandError = null;

        // Set the TTL for all set keys since we're done setting them
        for(var i = 0, redisDataLength = redisData.length; i < redisDataLength; i += 2) {
            // Use the expire command, add a latch
            latch.add();
            redis.expire(redisData[i], config.redis.cacheExpire, function(err) {
                // Catch errors
                if(err !== null && err !== undefined && commandError === null)
                    commandError = new Error(err);

                // Resolve the callback latch
                latch.resolve();
            });
        }

        // Call back when we're done, pass along errors
        latch.then(function() {
            if(callback !== undefined)
                callback(commandError);

            else if(commandError !== null)
                throw commandError;
        });
    });
};

/**
 * Called when the values are set, or when an error occurred.
 *
 * @callback BaseModel~redisSetFieldsCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Check whether the given field is available in Redis.
 *
 * @param {String} field Name of the field.
 * @param {BaseModel~redisHasFieldCallback} callback Called with the result, or when an error occurred.
 */
BaseModel.prototype.redisHasField = function(field, callback) {
    // Get the field result through the bulk function
    this.redisHasFields(field, callback);
};

/**
 * Called with the result, or when an error occurred.
 *
 * @callback BaseModel~redisHasFieldCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean=} The result, true if Redis has the field, false if not.
 */

/**
 * Check whether the given fields are available in Redis.
 *
 * @param {Array|String} fields Array of field names or a single field name.
 * @param {BaseModel~redisHasFieldsCallback} callback Called with the result, or when an error occurred.
 */
BaseModel.prototype.redisHasFields = function(fields, callback) {
    // Call back if Redis isn't ready
    if(!RedisUtils.isReady()) {
        callback(null);
        return;
    }

    // Call back false if Redis isn't enabled for all fields
    if(!this.redisAreFieldsEnabled(fields)) {
        callback(null, false);
        return;
    }

    // Store the current instance
    const self = this;

    // Convert the fields parameter to an array
    if(!Array.isArray(fields))
        fields = [fields];

    // Create an array of Redis keys
    var keys = [];
    fields.forEach(function(field) {
        keys.push(self.redisGetKey(field));
    });

    // Get the Redis connection instance
    var redis = RedisUtils.getConnection();

    // Check whether the keys are available in Redis
    redis.exists(keys, function(err, reply) {
        // Call back if an error occurred
        if(err !== null) {
            callback(new Error(err));
            return;
        }

        // Call back with the result
        callback(null, reply === fields.length);
    });
};

/**
 * Called with the result, or when an error occurred.
 *
 * @callback BaseModel~redisHasFieldsCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean=} The result, true if all the given fields exist in Redis, false if not.
 */

/**
 * Flush the fields from Redis.
 * If specific fields are given, only those fields are flushed from Redis if they exist.
 *
 * @param {Array|String} [fields=undefined] Array of field names, or name of the field to flush, undefined to flush all fields in Redis.
 * @param {BaseModel~redisFlushCallback} [callback] Called when the fields are flushed, or when an error occurred.
 */
BaseModel.prototype.redisFlush = function(fields, callback) {
    // Call back if Redis isn't ready
    if(!RedisUtils.isReady()) {
        if(callback !== undefined)
            callback(null, 0);
        return;
    }

    // Create an array of keys to delete
    var keys = [];

    // Flush a specific field if a field is given
    if(fields !== undefined && fields !== null) {
        // Convert the fields to an array
        if(!_.isArray(fields)) {
            // Make sure we're working with a string
            if(!_.isString(fields)) {
                callback(new Error('Invalid key, not an array or string'), 0);
                return;
            }

            // Convert the field string into an array
            fields = [fields];
        }

        // Loop through the fields, and push their Redis keys to the keys array
        fields.forEach(function(field) {
            // Get the Redis key, and put it in the keys array
            keys.push(this.redisGetKey(field));
        });

    } else
        // Push the base wildcard key into the array of keys
        keys.push(this.redisGetKeyRoot() + ':*');

    // Flush the list of keys from Redis
    RedisUtils.flushKeys(keys, function(err, keyCount) {
        // Call back errors
        if(err !== null) {
            if(callback !== undefined)
                callback(err, 0);
            return;
        }

        // Call back the number of deleted keys
        if(callback !== undefined)
            callback(null, keyCount);
    });
};

/**
 * Called when the fields are flushed, or when an error occurred.
 *
 * @callback BaseModel~redisFlushCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 * @param {Number} Number of keys that were deleted from Redis.
 */

// Export the class
module.exports = BaseModel;
