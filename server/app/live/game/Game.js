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
var GameModel = require('../../model/game/GameModel');
var UserManager = require('../user/UserManager');
var FactoryManager = require('../factory/FactoryManager');
var CallbackLatch = require('../../util/CallbackLatch');

/**
 * Game class.
 *
 * @param {GameModel|ObjectId|string} game Game model instance or the ID of a game.
 *
 * @class
 * @constructor
 */
var Game = function(game) {
    /**
     * ID of the game this object corresponds to.
     * @type {ObjectId}
     */
    this._id = null;

    /**
     * Game model instance if available.
     * @type {GameModel|null} Game model instance or null if no instance is currently available.
     */
    this._model = null;

    /**
     * User manager instance.
     * @type {UserManager} User manager instance.
     */
    this.userManager = new UserManager(this);

    /**
     * Factory manager instance.
     * @type {FactoryManager} Factory manager instance.
     */
    this.factoryManager = new FactoryManager(this);

    // Get and set the game ID
    if(game instanceof GameModel)
        this._id = game.getId();
    else if(!(game instanceof ObjectId) && ObjectId.isValid(game))
        this._id = new ObjectId(game);
    else if(!(game instanceof ObjectId))
        throw new Error('Invalid game instance or ID');
    else
        this._id = game;

    // Store the game model instance if any was given
    if(game instanceof GameModel)
        this._model = game;
};

/**
 * Get the game ID for this game.
 *
 * @return {ObjectId} Game ID.
 */
Game.prototype.getId = function() {
    return this._id;
};

/**
 * Get the hexadecimal ID representation of the game.
 *
 * @returns {string} Game ID as hexadecimal string.
 */
Game.prototype.getIdHex = function() {
    return this.getId().toString();
};

/**
 * Check whether the give game instance or ID equals this game.
 *
 * @param {GameModel|ObjectId|string} game Game instance or the game ID.
 * @return {boolean} True if this game equals the given game instance.
 */
Game.prototype.isGame = function(game) {
    // Get the game ID as an ObjectId
    if(game instanceof GameModel)
        game = game.getId();
    else if(!(game instanceof ObjectId) && ObjectId.isValid(game))
        game = new ObjectId(game);
    else if(!(game instanceof ObjectId)) {
        callback(new Error('Invalid game ID'));
        return;
    }

    // Compare the game ID
    return this._id.equals(game);
};

/**
 * Get the game model.
 *
 * @return {GameModel} Game model instance.
 */
Game.prototype.getGameModel = function() {
    // Return the model if it isn't null
    if(this._model !== null)
        return this._model;

    // Create a game model for the known ID, store and return it
    return this._model = Core.model.gameModelManager._instanceManager.create(this._id);
};

/**
 * Get the game name.
 *
 * @param {Game~getNameCallback} callback Callback with the result.
 */
Game.prototype.getName = function(callback) {
    this.getGameModel().getName(callback);
};

/**
 * Get a user from this game.
 *
 * @param {UserModel|ObjectId|string} user User instance or user ID.
 * @param {Game~getUserCallback} callback Called with the user or when an error occurred.
 */
Game.prototype.getUser = function(user, callback) {
    return this.userManager.getUser(user, callback);
};

/**
 * Called with the user or when an error occurred.
 *
 * @callback Game~getUserCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 * @param {User=} User instance.
 */

/**
 * Unload this live game instance.
 *
 * @param {Game~loadCallback} callback Called on success or when an error occurred.
 */
Game.prototype.load = function(callback) {
    // Create a callback latch
    var latch = new CallbackLatch();

    // Make sure we only call back once
    var calledBack = false;

    // Load the user manager
    latch.add();
    this.userManager.load(function(err) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Resolve the latch
        latch.resolve();
    });

    // Load the factory manager
    latch.add();
    this.factoryManager.load(function(err) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Resolve the latch
        latch.resolve();
    });

    // Call back
    latch.then(() => callback(null));
};

/**
 * Called on success or when an error occurred.
 *
 * @callback Game~loadCallback
 * @param {Error|null} Error instance if an error occurred, null on success.kk
 */

/**
 * Unload this live game instance.
 */
Game.prototype.unload = function() {
    // TODO: Unload the user manager for this game?
};

/**
 * @callback Game~getNameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {string} Game name.
 */

/**
 * Get the game configuration.
 * @param callback callback(err, config)
 */
Game.prototype.getConfig = function(callback) {
    this.getGameModel().getConfig(callback);
};

/**
 * Calculate the cost to build a new factory.
 *
 * @param {TeamModel} team Team model the user is in.
 * @param {Game~calculateFactoryCostCallback} callback
 */
Game.prototype.calculateFactoryCost = function(team, callback) {
    // Get the game configuration
    this.getConfig(function(err, config) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Calculate the factory cost
        callback(null, config.factory.calculateCost());
    });
};

/**
 * @callback Game~calculateFactoryCostCallback
 * @param {Error|null} Error instance if an error occurred.
 * @param {Number} Cost.
 */

// Export the class
module.exports = Game;