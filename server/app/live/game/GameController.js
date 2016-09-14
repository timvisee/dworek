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

var Core = require('../../../Core');
var Game = require('./Game');
var GameModel = require('../../model/game/GameModel');

/**
 * GameController class.
 *
 * @class
 * @constructor
 */
var GameController = function() {
    /**
     * List containing all loaded games.
     *
     * @type {Array} Array of games.
     */
    this.games = [];
};

/**
 * Get the given game.
 *
 * @param {GameModel|ObjectId|string} gameId Game instance or the game ID to get the game for.
 * @param {GameController~getGameCallback} callback Called back with the game or when an error occurred.
 */
GameController.prototype.getGame = function(gameId, callback) {
    // Get the game ID as an ObjectId
    if(gameId instanceof GameModel)
        gameId = gameId.getId();
    else if(!(gameId instanceof ObjectId) && ObjectId.isValid(gameId))
        gameId = new ObjectId(gameId);
    else {
        callback(new Error('Invalid game ID'));
        return;
    }

    // Get the game if it's already loaded
    const loadedGame = this.getLoadedGame(gameId);
    if(loadedGame !== null) {
        callback(null, loadedGame);
        return;
    }

    // Store this instance
    const self = this;

    // Get the game for the given ID
    Core.model.gameModelManager.getGameById(gameId, function(err, game) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Make sure the stage of this game is active
        game.getStage(function(err, stage) {
            // Call back errors
            if(err !== null) {
                callback(err);
                return;
            }

            // Make sure the stage is valid
            if(stage != 1) {
                callback(null, null);
                return;
            }

            // Create a game instance for this model
            var newGame = new Game(game);

            // Add the game to the list of loaded games
            self.games.push(newGame);

            // Call back the game
            callback(null, newGame);
        });
    });
};

/**
 * Called back with the game or when an error occurred.
 *
 * @callback GameController~getGameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Game|null=} Game instance, null if the game isn't active or if the game is invalid.
 */

/**
 * Get the loaded game instance for the given game ID.
 * Null will be returned if no game is loaded for the given game ID.
 *
 * @param {GameModel|ObjectId|string} gameId Game instance or the game ID to get the game for.
 */
GameController.prototype.getLoadedGame = function(gameId) {
    // Get the game ID as an ObjectId
    if(gameId instanceof GameModel)
        gameId = gameId.getId();
    else if(!(gameId instanceof ObjectId) && ObjectId.isValid(gameId))
        gameId = new ObjectId(gameId);
    else {
        callback(new Error('Invalid game ID'));
        return;
    }

    // Keep track of the found game
    var result = null;

    // Loop through the list of games
    this.games.forEach(function(entry) {
        // Skip if we already found a game
        if(result != null)
            return;

        // Check whether the game ID equals the game
        if(entry.isGame(gameId))
            result = entry;
    });

    // Return the result
    return result;
};

/**
 * Check whether the game for the given game ID is loaded.
 *
 * @param {GameModel|ObjectId|string} gameId Game instance or the game ID.
 * @return {boolean} True if the game is currently loaded, false if not.
 */
GameController.prototype.isGameLoaded = function(gameId) {
    return this.getLoadedGame(gameId) != null;
};

/**
 * Get the number of loaded games.
 *
 * @returns {Number} Number of loaded games.
 */
GameController.prototype.getLoadedGameCount = function() {
    return this.games.length;
};

/**
 * Load all active games, that aren't loaded yet.
 *
 * @param {GameController~loadActiveGamesCallback} [callback] Callback called when done loading.
 */
GameController.prototype.loadActiveGames = function(callback) {
    // TODO: Load all active games here, that aren't loaded yet!

    // Call the callback
    if(callback !== undefined)
        callback(null);
};

/**
 * @callback GameController~loadActiveGamesCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 */

// Export the class
module.exports = GameController;