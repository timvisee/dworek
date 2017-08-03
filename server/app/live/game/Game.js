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
var GameLangManager = require('../../lang/GameLangManager');
var ShopManager = require('../shop/ShopManager');
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
     * User manager instance.
     * @type {UserManager} User manager instance.
     */
    this.userManager = new UserManager(this);

    /**
     * Factory manager instance.
     * @type {FactoryManager} Factory manager instance.
     */
    this.factoryManager = new FactoryManager(this);

    /**
     * Shop manager instance.
     * @type {ShopManager}
     */
    this.shopManager = new ShopManager(this);

    /**
     * Language manager instance.
     * @type {GameLangManager}
     */
    this.gameLangManager = new GameLangManager(this);

    // Get and set the game ID
    if(game instanceof GameModel)
        this._id = game.getId();
    else if(!(game instanceof ObjectId) && ObjectId.isValid(game))
        this._id = new ObjectId(game);
    else if(!(game instanceof ObjectId))
        throw new Error('Invalid game instance or ID');
    else
        this._id = game;
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
    return Core.model.gameModelManager._instanceManager.create(this._id);
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

    // Load the shop manager
    latch.add();
    this.shopManager.load(function(err) {
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
 * @param {GameTeamModel} team Team model the user is in.
 * @param {Game~calculateFactoryCostCallback} callback
 */
Game.prototype.calculateFactoryCost = function(team, callback) {
    // Ally factory count and game configuration
    var factoryTeamCounts = null;
    var gameConfig = null;

    // Create a callback latch
    var latch = new CallbackLatch();

    // Only call back once
    var calledBack = false;

    // Get the number of factories
    latch.add();
    this.getTeamFactoryCount(function(err, result) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the count
        factoryTeamCounts = result;

        // Resolve the latch
        latch.resolve();
    });

    // Get the game configuration
    latch.add();
    this.getConfig(function(err, result) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the config
        gameConfig = result;

        // Resolve the latch
        latch.resolve();
    });

    // Calculate the factory cost when we fetched the required data
    latch.then(function() {
        // Get the ally count
        const allyCount = factoryTeamCounts[team.getIdHex()];

        // Count the number of enemy factories and teams
        var enemyFactories = 0;
        var enemyTeams = 0;
        for(var teamId in factoryTeamCounts) {
            // Make sure the key is valid
            if(!factoryTeamCounts.hasOwnProperty(teamId))
                continue;

            // Make sure this is an enemy team
            if(team.getId().equals(teamId))
                continue;

            // Increase the team count and enemy factory size
            enemyFactories += factoryTeamCounts[teamId];
            enemyTeams++;
        }

        // Calculate the average enemy factory count
        const avgEnemyFactoryCount = enemyTeams > 0 ? (enemyFactories / enemyTeams) : 0;

        // Calculate the cost
        var cost = gameConfig.factory.getBuildCost(allyCount, avgEnemyFactoryCount);
        if(cost == 0 || isNaN(cost))
            cost = 0;

        // Calculate and call back the cost
        callback(null, cost);
    });
};

/**
 * @callback Game~calculateFactoryCostCallback
 * @param {Error|null} Error instance if an error occurred.
 * @param {Number} Cost.
 */

/**
 * Get the number of factories a team has.
 *
 * @param {Game~getTeamFactoryCount} callback Called with the factory count or when an error occurred.
 */
Game.prototype.getTeamFactoryCount = function(callback) {
    // Number of factories by team
    var counts = {};

    // Create a callback latch
    var latch = new CallbackLatch();

    // Only call back once
    var calledBack = false;

    // Loop through all factories
    this.factoryManager.factories.forEach(function(liveFactory) {
        // Get the factory team
        latch.add();
        liveFactory.getTeam(function(err, factoryTeam) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Make sure the factory team isn't null
            if(factoryTeam == null) {
                latch.resolve();
                return;
            }

            // Get the team ID
            const rawTeamId = factoryTeam.getIdHex();

            // Get the current count for this team
            var count = 0;
            if(counts.hasOwnProperty(rawTeamId))
                count = counts[rawTeamId];

            // Increase the count
            count++;

            // Set the count in the object
            counts[rawTeamId] = count;

            // Resolve the latch
            latch.resolve();
        });
    });

    // Call back the number of factories
    latch.then(() => callback(null, counts));
};

/**
 * Called with the factory count or when an error occurred.
 *
 * @callback Game~getTeamFactoryCount
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Object=} Object of factory counts.
 */

/**
 * Get the money amount for each team in an object.
 *
 * @param {GameTeamModel|undefined} teamFilter Team filter, or undefined to get all teams.
 * @param {Game~getTeamMoneyCallback} callback Called with the result array, or when an error occurred.
 */
Game.prototype.getTeamMoney = function(teamFilter, callback) {
    // Create a team object
    var teamObject = {};

    // Create a callback latch
    var latch = new CallbackLatch();

    // Make sure we only call back once
    var calledBack = false;

    // Loop through all users
    this.userManager.users.forEach(function(liveUser) {
        // Create a callback latch for the user data
        var userLatch = new CallbackLatch();

        // Create a variable for the amount of money in a team, and the team name
        var money;
        var team;

        // Add a regular latch because we're going to fetch data for a user
        latch.add();

        // Get the team of the user
        userLatch.add();
        liveUser.getTeam(function(err, result) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Make sure the team isn't null
            if(result == null) {
                // Resolve the regular latch, don't add this user's data
                latch.resolve();
                return;
            }

            // Skip if this team is filtered
            if(teamFilter !== undefined && teamFilter.getId().equals(result)) {
                latch.resolve();
                return;
            }

            // Set the team instance
            team = result;

            // Resolve the user latch
            userLatch.resolve();
        });

        // Get the user's money
        userLatch.add();
        liveUser.getMoney(function(err, result) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Set the amount of money the user has
            money = result;

            // Resolve the user latch
            userLatch.resolve();
        });

        // Process the fetched user data
        userLatch.then(function() {
            // Get the ID of the team as a string
            const teamId = team.getIdHex();

            // Get the current team's money if it's in the object
            var teamMoney = 0;
            if(teamObject.hasOwnProperty(teamId))
                teamMoney = teamObject[teamId];

            // Add the money
            teamMoney += money;

            // Set the money for the team
            teamObject[teamId] = Math.round(teamMoney);

            // Resolve the normal latch
            latch.resolve();
        });
    });

    // Determine whether the filtered team is in the object
    var hasFilteredTeam = false;

    // Process the team money data when everything is fetched
    latch.then(function() {
        // Reset the latch back to it's identity
        latch.identity();

        // Create an array to put the team objects in
        var teamObjects = [];

        // Loop through the team's in the object
        Object.keys(teamObject).forEach(function(teamId) {
            // Get a team instance by it's ID
            const team = Core.model.gameTeamModelManager._instanceManager.create(teamId);

            // Check whether this is the filtered team, set the hasFilteredTeam to true in that case
            if(teamFilter !== undefined && teamFilter.getId().equals(teamId))
                hasFilteredTeam = true;

            // Get the name of the team
            latch.add();
            team.getName(function(err, name) {
                // Call back error
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Create a team object and push it into the array
                teamObjects.push({
                    id: teamId,
                    name,
                    money: teamObject[teamId]
                });

                // Resolve the latch
                latch.resolve();
            });
        });

        // Call back the array of team objects.
        latch.then(() => {
            // Make sure the filtered team is in the object
            if(teamFilter !== undefined)
                // Set the team's money to zero if it isn't currently in the object
                if(!hasFilteredTeam)
                    teamObjects[teamFilter.getIdHex()] = 0;

            // Call back the list of team objects
            callback(null, teamObjects)
        });
    });
};

/**
 * Called with an array of teams and their money, or when an error occurred.
 *
 * @callback Game~getTeamMoneyCallback
 * @param {Error|null} Error instance if an error occurred.
 * @param {Array=} An array of TeamMoneyObject objects defining a team and it's money.
 */

/**
 * @typedef {Object} TeamMoneyObject
 * @param {String} id ID of the team, as a string.
 * @param {String} name Display name of the team.
 * @param {Number} money Amount of money the team has.
 */

/**
 * Get the language manager.
 *
 * @return {GameLangManager} Language manager instance for this game.
 */
Game.prototype.getGameLangManager = function() {
    return this.gameLangManager;
};

/**
 * This routes the call to the rendering function the language manager for this game.
 *
 * Render the text/name for the given node/key in the current language.
 * This encapsulates the text in a span element, to allow dynamic language updates on the page.
 * The result string with the text and span element is returned as a string.
 *
 * If no known text is found for the given node, the node itself is returned,
 * encapsulated between curly brackets.
 *
 * @param {string} node The node or key for the language text.
 * @param {RenderNameConfigOptions|undefined|null} [options] Options object.
 */
Game.prototype.renderNameConfig = function(node, options) {
    return this.getGameLangManager().renderNameConfig(node, options);
};

/**
 * This routes the call to the rendering function the language manager for this game.
 *
 * Render the text/name for the given node/key in the current language.
 * This encapsulates the text in a span element, to allow dynamic language updates on the page.
 * The result string with the text and span element is returned as a string.
 *
 * If no known text is found for the given node, the node itself is returned,
 * encapsulated between curly brackets.
 *
 * @param {string} node The node or key for the language text.
 * @param {RenderNameConfigOptions|undefined|null} [options] Options object.
 */
Game.prototype.__ = Game.prototype.renderNameConfig;

/**
 * Get the game as a string.
 *
 * @return {String} String representation.
 */
Game.prototype.toString = function() {
    return '[Game:' + this.getIdHex() + ']';
};

// Export the class
module.exports = Game;