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

var config = require('../../../config');

var GameModel = require('./../game/GameModel');
var GameTeamDatabase = require('./GameTeamDatabase');
var GameTeamModel = require('./GameTeamModel');
var RedisUtils = require('../../redis/RedisUtils');
var ModelInstanceManager = require('../ModelInstanceManager');
var CallbackLatch = require('../../util/CallbackLatch');

/**
 * Redis key root for cache.
 * @type {string}
 */
const REDIS_KEY_ROOT = 'model:gameteam';

/**
 * GameTeamModelManager class.
 *
 * @class
 * @constructor
 */
var GameTeamModelManager = function() {
    /**
     * Model instance manager.
     *
     * @type {ModelInstanceManager}
     */
    this._instanceManager = new ModelInstanceManager(GameTeamModel);
};

/**
 * Check whether the given game team ID is valid and exists.
 *
 * @param {ObjectId|string} id The game team ID.
 * @param {GameTeamModelManager~isValidGameIdCallback} callback Called with the result or when an error occurred.
 */
GameTeamModelManager.prototype.isValidId = function(id, callback) {
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

    // Fetch the result from MongoDB when we're done with Redis
    latch.then(function() {
        // Query the database and check whether the game is valid
        GameTeamDatabase.layerFetchFieldsFromDatabase({_id: id}, {_id: true}, function(err, data) {
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
                        console.error('A Redis error occurred when storing Game Team ID validity, ignoring.')
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
 * @callback GameTeamModelManager~isValidGameIdCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean} True if a game with this ID exists, false if not.
 */

/**
 * Get a game team by it's game team ID.
 *
 * @param {ObjectId|string} id The game team ID.
 * @param {GameTeamModelManager~getTeamByIdCallback} callback Called with the game team or when an error occurred.
 */
GameTeamModelManager.prototype.getTeamById = function(id, callback) {
    // Store the current instance
    const self = this;

    // Check whether the game team ID is valid
    this.isValidId(id, function(err, result) {
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
 * Called with the game team or when an error occurred.
 *
 * @callback GameTeamModelManager~getTeamByIdCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {GameTeamModel|null} Game team instance, or null if no game was found for the given ID.
 */

/**
 * Get all the teams for the given game.
 *
 * @param {Game|ObjectId|string} game The game or the ID of the game to get the teams for.
 * @param {GameTeamModelManager~getGameTeamsCallback} callback Called with the result or when an error occurred.
 */
GameTeamModelManager.prototype.getGameTeams = function(game, callback) {
    // Validate the object ID, or get the object ID if a game is given
    if(game instanceof GameModel)
        game = game.getId();
    else if(game === null || game === undefined || !ObjectId.isValid(game)) {
        // Call back
        callback(null, false);
        return;
    }

    // Create a callback latch
    var latch = new CallbackLatch();

    // Store the current instance
    const self = this;

    // TODO: Check an instance for this ID is already available?

    // Determine the Redis cache key
    var redisCacheKey = REDIS_KEY_ROOT + ':getGameTeams:' + game.toString();

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

            // Call back an empty array if the string was empty
            if(result.trim().length === 0) {
                callback(null, []);
                return;
            }

            // Split the result
            var teamIds = result.split(",");

            // Create an array of teams
            var teams = [];

            // Loop through the team IDs
            teamIds.forEach((teamId) => teams.push(self._instanceManager.create(teamId)));

            // Call back the list of teams
            //noinspection JSCheckFunctionSignatures
            callback(null, teams);
        });
    }

    // Fetch the result from MongoDB when we're done with Redis
    latch.then(function() {
        // Query the database and check whether the game is valid
        GameTeamDatabase.layerFetchFieldsFromDatabase({game_id: game}, {_id: true, name: true}, function(err, data) {
            // Call back errors
            if(err !== null && err !== undefined) {
                // Encapsulate the error and call back
                callback(new Error(err), null);
                return;
            }

            // Create a list of team IDs and teams
            var teamIds = [];
            var teams = [];

            // Loop through the result data
            data.forEach(function(teamObject) {
                // Get the team ID and team name
                const teamId = teamObject._id;
                const teamName = teamObject.name;

                // Add the team ID to the list
                teamIds.push(teamId);

                // Create a new team object, and internally cache the team name to improve performance
                const team = self._instanceManager.create(teamId);
                team._baseModel.cacheSetField('name', teamName);

                // Put the game into the list of games
                teams.push(team);
            });

            // Call back with the list of teams
            callback(null, teams);

            // Store the result in Redis if ready
            if(RedisUtils.isReady()) {
                // Combine all team IDs in one string to cache
                var teamsString = teamIds.join(',');

                // Store the results
                RedisUtils.getConnection().setex(redisCacheKey, config.redis.cacheExpire, teamsString, function(err) {
                    // Show a warning on error
                    if(err !== null && err !== undefined) {
                        console.error('A Redis error occurred when storing game teams, ignoring.');
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
 * @callback GameTeamModelManager~getGameTeamsCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Array} Array of teams for this game. An empty array is returned if the game doesn't have any team.
 */

/**
 * Get the number of teams for the given game.
 *
 * @param {Game|ObjectId|string} game The game or the ID of the game to get the number of teams for.
 * @param {GameTeamModelManager~getGameTeamCountCallback} callback Called with the result or when an error occurred.
 */
GameTeamModelManager.prototype.getGameTeamCount = function(game, callback) {
    // Validate the object ID, or get the object ID if a game is given
    if(game instanceof GameModel)
        game = game.getId();
    else if(game === null || game === undefined || !ObjectId.isValid(game)) {
        // Call back
        callback(null, false);
        return;
    }

    // Create a callback latch
    var latch = new CallbackLatch();

    // Store the current instance
    const self = this;

    // TODO: Check an instance for this ID is already available?

    // Determine the Redis cache key
    var redisCacheKey = REDIS_KEY_ROOT + ':getGameTeamCount:' + game.toString();

    // Check whether the game is valid through Redis if ready
    if(RedisUtils.isReady()) {
        // TODO: Update this caching method!
        // Fetch the result from Redis
        latch.add();
        RedisUtils.getConnection().get(redisCacheKey, function(err, result) {
            // Show a warning if an error occurred
            if(err !== null && err !== undefined) {
                // Print the error to the console
                console.error('A Redis error occurred while checking game validity, falling back to MongoDB.');
                console.error(new Error(err));

                // Resolve the latch and return
                latch.resolve();
                return;
            }

            // Call back zero
            if(result === '0') {
                // Call back the result
                callback(null, 0);
                return;
            }

            // Resolve the latch if the result is undefined, null or zero
            if(result === undefined || result === null || result == 0) {
                // Resolve the latch and return
                latch.resolve();
                return;
            }

            // Convert the result to an integer and return it
            callback(null, parseInt(result, 10));
        });
    }

    // Fetch the result from MongoDB when we're done with Redis
    latch.then(function() {
        // Query the database and check whether the game is valid
        GameTeamDatabase.layerFetchFieldsFromDatabase({game_id: game}, {_id: true, name: true}, function(err, data) {
            // Call back errors
            if(err !== null && err !== undefined) {
                // Encapsulate the error and call back
                callback(new Error(err), null);
                return;
            }

            // Count the number of teams
            const teamCount = data.length;

            // Call back with the number of teams
            callback(null, teamCount);

            // Store the result in Redis if ready
            if(RedisUtils.isReady()) {
                // Store the results
                RedisUtils.getConnection().setex(redisCacheKey, config.redis.cacheExpire, teamCount.toString(), function(err) {
                    // Show a warning on error
                    if(err !== null && err !== undefined) {
                        console.error('A Redis error occurred when storing game teams, ignoring.');
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
 * @callback GameTeamModelManager~getGameTeamCountCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Number} Number of teams for this game.
 */

/**
 * Flush the cache for this model manager.
 *
 * @param {GameTeamModelManager~flushCacheCallback} callback Called on success or when an error occurred.
 */
GameTeamModelManager.prototype.flushCache = function(callback) {
    // Determine the cache key for this manager and wildcard it
    const cacheKey = GameTeamModelManager.REDIS_KEY_ROOT + ':*';

    // Flush the cache
    RedisUtils.flushKeys(cacheKey, function(err, keyCount) {
        // Call back errors
        if(err !== null) {
            callback(err, 0);
            return;
        }

        // Call back with the number of deleted cache keys
        callback(null, keyCount);
    });
};

/**
 * Called on success or when an error occurred.
 *
 * @callback GameTeamModelManager~flushCacheCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 * @param {Number} Number of deleted/flushed keys.
 */

// Return the created class
module.exports = GameTeamModelManager;
