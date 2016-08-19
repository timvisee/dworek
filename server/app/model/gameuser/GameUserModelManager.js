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
var merge = require('utils-merge');
var _ = require('lodash');

var config = require('../../../config');

var GameUserDatabase = require('./GameUserDatabase');
var GameUserModel = require('./GameUserModel');
var RedisUtils = require('../../redis/RedisUtils');
var ModelInstanceManager = require('../ModelInstanceManager');
var CallbackLatch = require('../../util/CallbackLatch');

/**
 * GameUserModelManager class.
 *
 * @class
 * @constructor
 */
var GameUserModelManager = function() {
    /**
     * Model instance manager.
     *
     * @type {ModelInstanceManager}
     */
    this._instanceManager = new ModelInstanceManager(GameUserModel);
};

/**
 * Check whether the given game user ID is valid and exists.
 *
 * @param {ObjectId|string} id The game user ID.
 * @param {GameUserModelManager~isValidGameIdCallback} callback Called with the result or when an error occurred.
 */
GameUserModelManager.prototype.isValidId = function(id, callback) {
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
    var redisCacheKey = 'model:gameuser:' + id.toString() + ':exists';

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
    GameUserDatabase.layerFetchFieldsFromDatabase({_id: id}, {_id: true}, function(err, data) {
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
                    console.error('A Redis error occurred when storing Game User ID validity, ignoring.')
                    console.error(new Error(err));
                }
            });
        }
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback GameUserModelManager~isValidGameIdCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean} True if a game with this ID exists, false if not.
 */

/**
 * Get a game user by it's game user ID.
 *
 * @param {ObjectId|string} id The game user ID.
 * @param {GameUserModelManager~getUserByIdCallback} callback Called with the game user or when an error occurred.
 */
GameUserModelManager.prototype.getUserById = function(id, callback) {
    // Store the current instance
    const self = this;

    // Check whether the game user ID is valid
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
 * Called with the game user or when an error occurred.
 *
 * @callback GameUserModelManager~getUserByIdCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {GameUserModel|null} Game user instance, or null if no game was found for the given ID.
 */

/**
 * Get the number of users that joined the given games.
 * The options parameter can be used to specify constraints for the query.
 *
 * @param {GameModel} game Game to get the player count for.
 * @param {Object} [options] Options object for additional configurations and constraints.
 * @param {boolean|undefined} [options.players=] True if the result must include players, false if the result may not
 * include players. Undefined if this constraint shouldn't be checked.
 * @param {boolean|undefined} [options.spectators=] True if the result must include spectators, false if the result may
 * not include spectators. Undefined if this constraint shouldn't be checked.
 * @param {boolean|undefined} [options.specials=] True if the result must include special players, false if the result
 * may not include special players. Undefined if this constraint shouldn't be checked.
 * @param {boolean|undefined} [options.queued=] True if the result must include queued players, false if the result may
 * not include queued players. This property overrides other constraints when set to true.
 * @param {GameModelManager~getGameUserCountCallback} callback Called with the result or when an error occurred.
 */
GameUserModelManager.prototype.getGameUserCount = function(game, options, callback) {
    // Create an object with the default options
    const defaultOptions = {
        players: undefined,
        spectators: undefined,
        specials: undefined,
        queued: undefined
    };

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

    // Override the options if queued is set to true
    if(options.queued !== undefined && options.queued) {
        options.players = false;
        options.spectators = false;
        options.specials = false;
    }

    // Determine the Redis cache key for this function
    const redisCacheKey = 'model:gameuser:getGamePlayerCount:' + game.getIdHex() + ':' +
        (options.players !== undefined ? (options.players ? '1' : '0') : '?') + ',' +
        (options.spectators !== undefined ? (options.spectators ? '1' : '0') : '?') + ',' +
        (options.specials !== undefined ? (options.specials ? '1' : '0') : '?') + ',' +
        (options.queued !== undefined ? (options.queued ? '1' : '0') : '?')+ ':count';

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

            // Call back the number of games
            callback(null, parseInt(result, 10));
        });
    }

    // Fetch the result from MongoDB when done with Redis
    latch.then(function() {
        // Create the query object
        var queryObject = {
            game_id: game.getId()
        };

        // Apply the queued property if it's set to false
        if(options.queued !== undefined && !options.queued) {
            queryObject.$or = [
                {team_id: {$ne: null}},
                {is_spectator: true},
                {is_special: true}
            ];
        }

        // Configure the fields object
        if(options.players !== undefined)
            queryObject.team_id = options.players ? {$ne: null} : null;
        if(options.spectators !== undefined)
            queryObject.is_spectator = options.spectators;
        if(options.specials !== undefined)
            queryObject.is_special = options.specials;

        // Query the database and check whether the game is valid
        GameUserDatabase.layerFetchFieldsFromDatabase(queryObject, {_id: true}, function(err, data) {
            // Call back errors
            if(err !== null && err !== undefined) {
                // Encapsulate the error and call back
                callback(new Error(err));
                return;
            }

            // Get the user count
            var userCount = data.length;

            // Call back with the user count
            callback(null, userCount);

            // Store the result in Redis if ready
            if(RedisUtils.isReady()) {
                // Store the results
                RedisUtils.getConnection().setex(redisCacheKey, config.redis.cacheExpire, userCount.toString(), function(err) {
                    // Show a warning on error
                    if(err !== null && err !== undefined) {
                        console.error('A Redis error occurred while storing game user count data ignoring.');
                        console.error(new Error(err));
                    }
                });
            }
        });
    });
};

/**
 * Called with the number of users for the given game with the given constraints.
 *
 * @callback GameModelManager~getGameUserCountCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Number=} Number of users.
 */

// Return the created class
module.exports = GameUserModelManager;
