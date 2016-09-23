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

Game.prototype.getTeamMoney = function(callback) {
    // Create a team object
    var teamObject = {};

    var latch = new CallbackLatch();

    // Loop through all users
    this.userManager.users.forEach(function(liveUser) {
        var userLatch = new CallbackLatch();
        var calledBack = false;

        var money;
        var team;

        latch.add();

        userLatch.add();
        liveUser.getTeam(function(err, result) {
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            if(result == null) {
                latch.resolve();
                return;
            }

            team = result;

            userLatch.resolve();
        });

        userLatch.add();
        liveUser.getMoney(function(err, result) {
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            money = result;

            userLatch.resolve();
        });

        userLatch.then(function() {
            const teamId = team.getIdHex();

            var teamMoney = 0;
            if(teamObject.hasOwnProperty(teamId))
                teamMoney = teamObject[teamId];

            teamMoney += money;

            teamObject[teamId] = Math.round(teamMoney);

            latch.resolve();
        });
    });

    latch.then(function() {
        latch.identity();

        var teamObjects = [];

        for(var teamId in teamObject) {
            if(!teamObject.hasOwnProperty(teamId))
                continue;

            latch.add();
            Core.model.gameTeamModelManager.getTeamById(teamId, function(err, team) {
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                team.getName(function(err, name) {
                    if(err !== null) {
                        if(!calledBack)
                            callback(err);
                        calledBack = true;
                        return;
                    }

                    teamObjects.push({
                        id: team.getIdHex(),
                        name,
                        money: teamObject[team.getIdHex()]
                    });

                    latch.resolve();
                });
            });
        }

        latch.then(function() {
           callback(null, teamObjects);
        });
    });
};

// Export the class
module.exports = Game;