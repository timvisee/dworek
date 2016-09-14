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
var mongo = require('mongodb');
var ObjectId = mongo.ObjectId;

var Core = require('../../../Core');
var Game = require('./Game');
var GameModel = require('../../model/game/GameModel');
var CallbackLatch = require('../../util/CallbackLatch');

/**
 * GameManager class.
 *
 * @class
 * @constructor
 */
var GameManager = function() {
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
 * @param {GameManager~getGameCallback} callback Called back with the game or when an error occurred.
 */
GameManager.prototype.getGame = function(gameId, callback) {
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
GameManager.prototype.getLoadedGame = function(gameId) {
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
GameManager.prototype.isGameLoaded = function(gameId) {
    return this.getLoadedGame(gameId) != null;
};

/**
 * Get the number of loaded games.
 *
 * @returns {Number} Number of loaded games.
 */
GameManager.prototype.getLoadedGameCount = function() {
    return this.games.length;
};

/**
 * Load all active games, that aren't loaded yet.
 *
 * @param {GameManager~loadCallback} [callback] Callback called when done loading.
 */
GameManager.prototype.load = function(callback) {
    // Store this instance
    const self = this;

    // Determine whether we called back
    var calledBack = false;

    // Load all active games
    Core.model.gameModelManager.getGamesWithStage(1, function(err, games) {
        // Call back errors
        if(err !== null) {
            if(_.isFunction(callback))
                callback(err);
            return;
        }

        // Unload all currently loaded games
        self.unload();

        // Create a callback latch
        var latch = new CallbackLatch();

        // Loop through the list of games
        games.forEach(function(game) {
            // Create a game instance
            const gameInstance = new Game(game);

            // Load the game instance
            latch.add();
            gameInstance.load(function(err) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        if(_.isFunction(callback))
                            callback(err);
                    calledBack = true;
                    return;
                }

                // Add the game instance to the list
                self.games.push(gameInstance);

                // Resolve the latch
                latch.resolve();
            });
        });

        // Call back when we're done loading
        latch.then(function() {
            if(_.isFunction(callback))
                callback(null);
        });
    });
};

/**
 * @callback GameController~loadCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 */

/**
 * Load a specific game.
 *
 * @param {GameModel|ObjectId|string} gameId Game instance of game ID of the game to load.
 * @param {GameManager~loadGameCallback} callback Called on success or when an error occurred.
 */
GameManager.prototype.loadGame = function(gameId, callback) {
    // Get the game ID as an ObjectId
    if(gameId instanceof GameModel)
        gameId = gameId.getId();
    else if(!(gameId instanceof ObjectId) && ObjectId.isValid(gameId))
        gameId = new ObjectId(gameId);
    else {
        callback(new Error('Invalid game ID'));
        return;
    }

    // Show a status message
    console.log('Loading live game... (id: ' + gameId.toString() + ')');

    // Unload the game if it's already loaded
    this.unloadGame(gameId);

    // Create a new game instance and add it to the list of games
    const newGame = new Game(gameId);
    this.games.push(newGame);

    // Get the name of the game, and print a status message
    newGame.getGameModel().getName(function(err, name) {
        // Handle errors
        if(err !== null) {
            console.error('Failed to fetch game name, ignoring.');
            return;
        }

        // Show a status message
        console.log('Live game loaded successfully. (name: ' + name + ', id: ' + gameId.toString() + ')');
    });
};

/**
 * Called on success or when an error occurred.
 *
 * @callback GameManager~loadGameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 */

/**
 * Unload all loaded games.
 */
GameManager.prototype.unload = function() {
    // Loop through the list of games
    this.games.forEach(function(game) {
        // Unload the game
        game.unload();
    });
};

/**
 * Unload the given game.
 *
 * @param {GameModel|ObjectId|string} gameId Game instance or game ID to unload.
 */
GameManager.prototype.unloadGame = function(gameId) {
    // Get the game ID as an ObjectId
    if(gameId instanceof GameModel)
        gameId = gameId.getId();
    else if(!(gameId instanceof ObjectId) && ObjectId.isValid(gameId))
        gameId = new ObjectId(gameId);
    else {
        callback(new Error('Invalid game ID'));
        return;
    }

    // Show a status message
    console.log('Loading live game (id: ' + gameId.toString() + ')...');

    // Loop through the list of games, and determine what game to unload and what index to remove
    var removeIndex = -1;
    this.games.forEach(function(game) {
        // Skip if we're already moving one
        if(removeIndex >= 0)
            return;

        // Check whether this is the correct game
        if(game.isGame(gameId)) {
            // Show a status message
            game.getGameModel().getName(function(err, name) {
                // Handle errors
                if(err !== null) {
                    console.error('Failed to fetch game name, ignoring.');
                    return;
                }

                // Show a status message
                console.log('Unloaded live game. (name: ' + name + ', id: ' + gameId.toString() + ')');
            });

            // Unload the game
            game.unload();

            // Set the remove index
            removeIndex = -1;
        }
    });

    // Remove the game at the given index
    if(removeIndex >= 0)
        this.games.splice(removeIndex, 1);
};

// Export the class
module.exports = GameManager;