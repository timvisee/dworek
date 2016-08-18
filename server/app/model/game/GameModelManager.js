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

var ObjectId = require('mongodb').ObjectId;
var _ = require('lodash');
var merge = require('utils-merge');

var config = require('../../../config');

var GameDatabase = require('./GameDatabase');
var GameModel = require('./GameModel');
var RedisUtils = require('../../redis/RedisUtils');
var ModelInstanceManager = require('../ModelInstanceManager');
var CallbackLatch = require('../../util/CallbackLatch');

/**
 * GameModelManager class.
 *
 * @class
 * @constructor
 */
var GameModelManager = function() {
    /**
     * Model instance manager.
     *
     * @type {ModelInstanceManager}
     */
    this._instanceManager = new ModelInstanceManager(GameModel);
};

/**
 * Check whether the given game ID is valid and exists.
 *
 * @param {ObjectId|string} id The game ID.
 * @param {GameModelManager~isValidGameIdCallback} callback Called with the result or when an error occurred.
 */
GameModelManager.prototype.isValidGameId = function(id, callback) {
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
    var redisCacheKey = 'model:game:' + id.toString() + ':exists';

    // Check whether the game is valid through Redis if ready
    if(RedisUtils.isReady()) {
        // TODO: Update this caching method!
        // Fetch the result from Redis
        latch.add();
        RedisUtils.getConnection().get(redisCacheKey, function(err, result) {
            // Show a warning if an error occurred
            if(err !== null && err !== undefined) {
                // Print the error to the console
                console.error('A Redis error occurred while checking game validity, falling back to MongoDB.')
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

            // The game is valid, create an instance and call back
            //noinspection JSCheckFunctionSignatures
            callback(null, self._instanceManager.create(id));
        });
    }

    // Create a variable to store whether a game exists with the given ID
    var hasGame = false;

    // Query the database and check whether the game is valid
    GameDatabase.layerFetchFieldsFromDatabase({_id: id}, {_id: true}, function(err, data) {
        // Call back errors
        if(err !== null && err !== undefined) {
            // Encapsulate the error and call back
            callback(new Error(err), null);
            return;
        }

        // Determine whether a game exists for this ID
        hasGame = data.length > 0;

        // Call back with the result
        callback(null, hasGame);

        // Store the result in Redis if ready
        if(RedisUtils.isReady()) {
            // Store the results
            RedisUtils.getConnection().setex(redisCacheKey, config.redis.cacheExpire, hasGame ? 1 : 0, function(err) {
                // Show a warning on error
                if(err !== null && err !== undefined) {
                    console.error('A Redis error occurred when storing Game ID validity, ignoring.')
                    console.error(new Error(err));
                }
            });
        }
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback GameModelManager~isValidGameIdCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean} True if a game with this ID exists, false if not.
 */

/**
 * Check whether the given game stage value is valid.
 * The value must be a number, and must equal to one of the game stage values.
 *
 * @param {*} stage Game state value to test.
 *
 * @return {boolean} True if the game stage value is valid, false if not.
 */
GameModelManager.prototype.isValidStage = function(stage) {
    // Make sure the stage is a number
    if(!_.isNumber(stage))
        return false;

    // Make sure the number is in-bound
    return stage >= 0 && stage <= 2;
};

/**
 * Get a game by it's game ID.
 *
 * @param {ObjectId|string} id The game ID.
 * @param {GameModelManager~getGameByIdCallback} callback Called with the game or when an error occurred.
 */
GameModelManager.prototype.getGameById = function(id, callback) {
    // Store the current instance
    const self = this;

    // Check whether the game ID is valid
    this.isValidGameId(id, function(err, result) {
        // Call back errors
        if(err !== null) {
            callback(err, null);
            return;
        }

        // Call back the result
        callback(null, result ? self._instanceManager.create(id) : null);
    })
};

/**
 * Get all games for the given stage.
 *
 * @param {Number} stage Game stage value.
 * @param {Object} [options] Options object for additional configurations.
 * @param {Number|undefined} [options.limit=3] Number of results to limit on, undefined to disable result limitation.
 * @param {GameModelManager~getGamesWithStageCallback} callback Called with the result or when an error occurred.
 */
GameModelManager.prototype.getGamesWithStage = function(stage, options, callback) {
    // Create an object with the default options
    const defaultOptions = {
        limit: 3
    };

    // Make sure the game stage value is valid, call back if not
    if(!this.isValidStage(stage)) {
        callback(new Error('Invalid game stage value.'));
        return;
    }

    // Set the callback parameter if the options parameter is left out
    if(_.isFunction(options)) {
        // Set the callback parameter and set the options to the default
        //noinspection JSValidateTypes
        callback = options;
        options = {};
    }

    // Set the options to an empty object if it's undefined
    if(options === undefined)
        options = {};

    // Merge the options
    options = merge(options, defaultOptions);

    // Create a callback latch
    var latch = new CallbackLatch();

    // Store the current instance
    const self = this;

    // Determine the Redis cache key for this function
    const redisCacheKey = 'model:game:gamesWithStage' + (_.isNumber(options.limit) ? ':limit' + options.limit : '');

    // Check whether the game is valid through Redis if ready
    if(RedisUtils.isReady()) {
        // TODO: Update this caching method!
        // Fetch the result from Redis
        latch.add();
        RedisUtils.getConnection().get(redisCacheKey, function(err, result) {
            // Show a warning if an error occurred
            if(err !== null && err !== undefined) {
                // Print the error to the console
                console.error('A Redis error occurred while listing games, falling back to MongoDB.')
                console.error(new Error(err));

                // Resolve the latch and return
                latch.resolve();
                return;
            }

            // Resolve the latch if the result is undefined, null, zero or an empty string
            if(result === undefined || result === null) {
                // Resolve the latch and return
                latch.resolve();
                return;
            }

            // Split the string by commas
            var gameIds = result.split(',');

            // Create an array of games
            var games = [];

            // Loop through the game ID's to construct game instances
            gameIds.forEach((gameId) => games.push(self._instanceManager.create(gameId)));

            // Call back the list of games
            callback(null, games);
        });
    }

    // Create the fetch field options object
    var fetchFieldOptions = {
        sortField: 'create_date',
        sortAscending: false
    };

    // Set the results limit
    if(options.hasOwnProperty('limit'))
        fetchFieldOptions.limit = options.limit;

    // Query the database and check whether the game is valid
    GameDatabase.layerFetchFieldsFromDatabase({stage}, {_id: true}, options, function(err, data) {
        // Call back errors
        if(err !== null && err !== undefined) {
            // Encapsulate the error and call back
            callback(new Error(err));
            return;
        }

        // Create an array of game instances and game IDs
        var games = [];
        var gameIds = [];

        // Loop through the data array
        data.forEach(function(gameData) {
            // Get the game ID
            var id = gameData._id;

            // Create a game instance and add it to the array
            games.push(self._instanceManager.create(id));

            // Add the game ID to the list
            gameIds.push(id.toString());
        });

        // Call back with the result
        callback(null, games);

        // Store the result in Redis if ready
        if(RedisUtils.isReady()) {
            // Create a comma separated string for the list of game IDs
            var gameIdsString = gameIds.join(',');

            // Store the results
            RedisUtils.getConnection().setex(redisCacheKey, config.redis.cacheExpire, gameIdsString, function(err) {
                // Show a warning on error
                if(err !== null && err !== undefined) {
                    console.error('A Redis error occurred while storing game list data, ignoring.')
                    console.error(new Error(err));
                }
            });
        }
    });
};

/**
 * Called with a list of games or when an error occurred.
 *
 * @callback GameModelManager~getGamesWithStageCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Array=} Array of games. The array may be empty of no results were fetched for the given query.
 */

// Return the created class
module.exports = GameModelManager;
