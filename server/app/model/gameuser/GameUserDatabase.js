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

var _ = require('lodash');

var Core = require('../../../Core');
var MongoUtil = require('../../mongo/MongoUtils');

/**
 * Constructor.
 *
 * @returns {GameUserDatabase} GameUserDatabase instance.
 */
var GameUserDatabase = function() {};

/**
 * Database collection name.
 */
GameUserDatabase.DB_COLLECTION_NAME = 'game_user';

/**
 * Add a game user to the database.
 * The team, special and spectator parameters may be set to null, false and false in order to create a game join request
 * for the given user.
 *
 * @param {GameModel} game Game.
 * @param {UserModel} user User.
 * @param {GameTeamModel|null} team Team if the game user has any, or null if the user doesn't have a team.
 * @param {boolean} isSpecial True if this game user is special, false if not.
 * @param {boolean} isSpectator True if this game user is a spectator, false if not.
 * @param {function} callback (err, {GameUserModel} gameUserId) Callback.
 */
GameUserDatabase.addGameUser = function(game, user, team, isSpecial, isSpectator, callback) {
    // Get the database instance
    const db = MongoUtil.getConnection();

    // Get the game configuration.
    game.getConfig(function(err, gameConfig) {
        // Call back errors
        if(err !== null) {
            callback(err, null);
            return;
        }

        // Create the object to insert
        // TODO: Dynamically get the proper field names from the model configuration
        const insertObject = {
            game_id: game.getId(),
            user_id: user.getId(),
            team_id: team == null ? null : team.getId(),
            is_special: isSpecial,
            is_spectator: isSpectator,
            money: gameConfig.player.initialMoney,
            in: gameConfig.player.initialIn,
            out: gameConfig.player.initialOut,
            strength: gameConfig.player.initialStrength
        };

        // Insert the game user into the database
        db.collection(GameUserDatabase.DB_COLLECTION_NAME).insertOne(insertObject, function(err) {
            // Handle errors and make sure the status is ok
            if(err !== null) {
                // Show a warning and call back with the error
                console.warn('Unable to create new game user, failed to insert game user into database.');
                callback(err, null);
                return;
            }

            // Flush the model manager cache
            Core.model.gameUserModelManager.flushCache(function(err) {
                // Call back errors
                if(err !== null) {
                    callback(err);
                    return;
                }

                // Call back with the inserted ID
                callback(null, Core.model.gameUserModelManager._instanceManager.create(insertObject._id));
            });
        });
    });
};

/**
 * Add a game user request to the database.
 *
 * @param {GameModel} game Game.
 * @param {UserModel} user User.
 * @param {function} callback (err, {ObjectId} gameUserId) Callback.
 */
GameUserDatabase.addGameUserRequest = function(game, user, callback) {
    this.addGameUser(game, user, null, false, false, callback);
};

/**
 * Do a find query on the API token database. Parse the result as an array through a callback.
 *
 * @param a First find parameter.
 * @param b Second find parameter.
 * @param {Object} [options] Additional options.
 * @param {Number} [options.limit] Number of items to limit the result to.
 * @param {string} [options.sortField=] Field to sort on.
 * @param {boolean} [options.sortAscending=true] True to sort in ascending order, false to sort in descending order.
 * @param {function} callback (err, data) Callback.
 */
// TODO: Copy this updated function to other Model Database instances too
GameUserDatabase.layerFetchFieldsFromDatabase = function(a, b, options, callback) {
    // Get the database instance
    var db = MongoUtil.getConnection();

    // Set the callback parameter if the options parameter was left out
    if(_.isFunction(options)) {
        //noinspection JSValidateTypes
        callback = options;
        options = {};
    }

    // Create the find query
    var findQuery = db.collection(GameUserDatabase.DB_COLLECTION_NAME).find(a, b);

    // Sort the results
    if(options.hasOwnProperty('sortField')) {
        // TODO: Translate the field name to MongoDB

        // Set the sorting order property if not set
        if(!options.hasOwnProperty('sortAscending'))
            options.sortAscending = true;

        // Sort
        findQuery = findQuery.sort(options.sortField, options.sortAscending ? 1 : -1);
    }

    // Limit the results
    //noinspection JSValidateTypes
    if(options.hasOwnProperty('limit') && options.limit !== undefined)
        findQuery = findQuery.limit(options.limit);

    // Convert the results into an array and call back
    findQuery.toArray(callback);
};

// Export the user database module
module.exports = GameUserDatabase;
