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

var _ = require("lodash");
var mongo = require('mongodb');
var ObjectId = mongo.ObjectId;

var Core = require('../../../Core');
var GameModel = require('../../model/game/GameModel');
var UserManager = require('../user/UserManager');
var User = require('../../live/user/User');
var FactoryManager = require('../factory/FactoryManager');
var GameLangManager = require('../../lang/GameLangManager');
var GameTeamModel = require('../../model/gameteam/GameTeamModel');
var ShopManager = require('../shop/ShopManager');
var CallbackLatch = require('../../util/CallbackLatch');
var PacketType = require("../../realtime/PacketType");

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
    this.gameLangManager = new GameLangManager();

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

    // Store a reference to self
    const self = this;

    // Load the language object
    latch.add();
    this.getGameModel().getLangObject(function(err, gameLangObject) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the language object
        self.gameLangManager.setGameLangObject(gameLangObject);

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
        if(cost === 0 || isNaN(cost))
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
            if(factoryTeam === null) {
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
    // Create a list of teams to process
    var teams = [];

    // Create a callback latch
    var latch = new CallbackLatch();
    var calledBack = false;

    // Add the team if it's given as filter
    if(teamFilter !== null && teamFilter !== undefined && teamFilter instanceof GameTeamModel)
        teams.push(teamFilter);

    else {
        // Get a list of teams for this game
        latch.add();
        Core.model.gameTeamModelManager.getGameTeams(this.getGameModel(), function(err, result) {
            // Call back errors
            if (err !== null) {
                callback(err);
                return;
            }

            // Set the list of teams
            teams = result;

            // Resolve the latch
            latch.resolve();
        });
    }

    // Continue when the list of teams is ready
    latch.then(function() {
        // Reset the latch to it's identity
        latch.identity();

        // Create an array to put all money objects into
        var teamMoneys = [];

        // Loop through each team and get it's money
        teams.forEach(function(team) {
            latch.add();

            // Create a team latch
            var teamLatch = new CallbackLatch();

            // Create a team money object
            var teamMoneyObject = {
                id: team.getIdHex(),
                name: '?',
                money: 0
            };

            // Get the name for this team
            teamLatch.add();
            team.getName(function(err, name) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Set the name
                teamMoneyObject.name = name;

                // Resolve the team latch
                teamLatch.resolve();
            });

            // Get the money for this team
            teamLatch.add();
            team.getTeamMoney(function(err, money) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Set the money
                teamMoneyObject.money = money;

                // Resolve the team latch
                teamLatch.resolve();
            });

            // Add the team money object to the list when we're done
            teamLatch.then(function() {
                // Add the object to the list
                teamMoneys.push(teamMoneyObject);

                // Resolve the main latch
                latch.resolve();
            });
        });

        // Call back the list of team money objects
        latch.then(function() {
            if(!calledBack)
                callback(null, teamMoneys);
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
 * Execute a special custom action in this game.
 *
 * @param {UserModel|User|ObjectId|string} user The user instance that executes this action.
 * @param {Object} properties An object of properties defining the behaviour of the custom action.
 * @param {function} callback Called back on success or when an error occurred.
 */
Game.prototype.executeSpecialCustomAction = function(user, properties, callback) {
    // Create a user latch
    var userLatch = new CallbackLatch();

    // Try to get the live user if the user isn't a live user instance already
    if(!(user instanceof User)) {
        userLatch.add();
        this.getUser(user, function (err, liveUser) {
            // Call back errors
            if (err !== null) {
                callback(err);
                return;
            }

            // Set the user instance
            user = liveUser;

            // Resolve the latch
            userLatch.resolve();
        });

    } else
        if(!user.getGame().getId().equals(this.getId())) {
            callback(new Error('The given user isn\'t part of this game'));
            return;
        }

    // Store a reference to this game
    const game = this;

    // Continue after we've parsed the user
    userLatch.then(function() {
        // Make sure the location of the user is known
        if(!user.hasLocation()) {
            callback(new Error('The location of this user is yet unknown'));
            return;
        }

        // Show an error if no unit was selected
        if(!properties.units.in && !properties.units.out && !properties.units.money) {
            Core.realTime.packetProcessor.sendPacketUser(PacketType.MESSAGE_RESPONSE, {
                error: false,
                message: 'Unable to execute the special custom action.<br><br>' +
                'Please select the units to be affected by this special action.<br><br>' +
                'Choose from money, ' + game.__('in.names') + ' and/or ' + game.__('out.names') + '.',
                dialog: true,
                toast: false
            }, user);
            return;
        }

        // Get the location of the user
        const location = user.getLocation();

        // Create a list of live players who will be affected
        var affectPlayers = [];
        var teams = [];

        // Create a callback latch
        var latch = new CallbackLatch();
        var calledBack = false;

        // Check whether specific players are assigned
        if(_.has(properties,'filters.specificPlayers.players') && _.isArray(properties.filters.specificPlayers.players)
            && properties.filters.specificPlayers.players.length > 0) {
            // Loop through the array of users
            properties.filters.specificPlayers.players.forEach(function(userId) {
                // Add a latch
                latch.add();

                // Return early if we already called back
                if(calledBack)
                    return;

                // Get the user
                game.getUser(userId, function(err, liveUser) {
                    // Call back errors
                    if(err !== null) {
                        if(!calledBack)
                            callback(err);
                        calledBack = true;
                        return;
                    }

                    // Return early if the user is null
                    if(liveUser === null || liveUser === undefined) {
                        latch.resolve();
                        return;
                    }

                    // Add the live user to the list
                    affectPlayers.push(liveUser);

                    // Resolve the latch
                    latch.resolve();
                });
            });

        } else
            // Just get a list of all users
            affectPlayers = game.userManager.users;

        // Get the teams for this game
        latch.add();
        Core.model.gameTeamModelManager.getGameTeams(game.getGameModel(), function(err, result) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Set the list of teams
            teams = result;

            // Resolve the latch
            latch.resolve();
        });

        // Continue when we've gathered the players
        latch.then(function() {
            // Reset the latch to it's identity
            latch.identity();

            // Check whether specific teams are assigned
            if(_.has(properties, 'filters.specificTeams.teams') && _.isArray(properties.filters.specificTeams.teams)
                && properties.filters.specificTeams.teams.length > 0) {
                // Create a latch for team filtering
                latch.add();
                var teamFilterLatch = new CallbackLatch();

                // Get the list of specific team IDs and process them
                const specificTeamIds = properties.filters.specificTeams.teams.map((id) => id.trim().toLowerCase());

                // Filter the list of teams
                teams = teams.filter((team) => _.includes(specificTeamIds, team.getIdHex()));

                // Create a list of team IDs
                var teamIds = [];
                teams.forEach(function(team) {
                    teamIds.push(team.getIdHex());
                });

                // Create a filtered players list
                var filteredPlayers = [];

                // Loop through the list of players and ensure they're in the proper team
                affectPlayers.forEach(function(player) {
                    // Add the latch
                    teamFilterLatch.add();

                    // Get the players team
                    player.getTeam(function(err, team) {
                        // Call back errors
                        if(err !== null) {
                            if(!calledBack)
                                callback(err);
                            calledBack = true;
                            return;
                        }

                        // Skip this player if it has no team
                        if(team === null) {
                            teamFilterLatch.resolve();
                            return;
                        }

                        // Get the ID and check whether it's in the list
                        if(_.includes(teamIds, team.getIdHex()))
                            filteredPlayers.push(player);

                        // Resolve the team filter latch
                        teamFilterLatch.resolve();
                    });
                });

                // Replace the list with the filtered list
                teamFilterLatch.then(function() {
                    // Update the list
                    affectPlayers = filteredPlayers;

                    // Resolve the main latch
                    latch.resolve();
                });

            } else {
                // Create a latch for team filtering
                latch.add();
                var noTeamFilterLatch = new CallbackLatch();

                // Create a filtered players list
                var noTeamFiltered = [];

                // Loop through the list of players and ensure they're in the proper team
                affectPlayers.forEach(function(player) {
                    // Add the latch
                    noTeamFilterLatch.add();

                    // Get the players team
                    player.hasTeam(function (err, hasTeam) {
                        // Call back errors
                        if(err !== null) {
                            if (!calledBack)
                                callback(err);
                            calledBack = true;
                            return;
                        }

                        // Add the player if it has a team
                        if(hasTeam)
                            noTeamFiltered.push(player);

                        // Resolve the team filter latch
                        noTeamFilterLatch.resolve();
                    });
                });

                // Replace the list with the filtered list
                noTeamFilterLatch.then(function () {
                    // Update the list
                    affectPlayers = noTeamFiltered;

                    // Resolve the main latch
                    latch.resolve();
                });
            }

            // Continue when we're done
            latch.then(function() {
                // Reset the latch to it's identity
                latch.identity();

                // Create a list of valid sorting orders
                const ORDER_OPTIONS = [ 'asc', 'desc' ];
                const PLAYER_ORDER_BY_OPTIONS = [ 'money' , 'in', 'out', 'strength', 'random' ];
                const TEAM_ORDER_BY_OPTIONS = [ 'money', 'factory', 'in', 'out', 'strength', 'defence', 'random'];

                // Check whether a player range is specified
                if(_.has(properties, 'filters.playerRange.limit') && _.isInteger(properties.filters.playerRange.limit)
                    && _.has(properties, 'filters.playerRange.orderBy') && _.isString(properties.filters.playerRange.orderBy)) {
                    // Set the default sorting order, and make sure it's valid
                    if(properties.filters.playerRange.order === undefined)
                        properties.filters.playerRange.order = 'desc';
                    if(!_.includes(ORDER_OPTIONS, properties.filters.playerRange.order)) {
                        if(!calledBack)
                            callback(new Error('Invalid sorting order'));
                        calledBack = true;
                        return;
                    }

                    // Make sure the order by value is valid
                    if(!_.includes(PLAYER_ORDER_BY_OPTIONS, properties.filters.playerRange.orderBy)) {
                        if(!calledBack)
                            callback(new Error('Invalid order by value, value not supported'));
                        calledBack = true;
                        return;
                    }

                    // Make sure the limit is is at least one or higher
                    if(properties.filters.playerRange.limit <= 0) {
                        if(!calledBack)
                            callback(new Error('Invalid player range limit, must be at least 1 or higher'));
                        calledBack = true;
                        return;
                    }

                    // Create a new array with the value to sort on
                    var playerSort = [];

                    // Create a sorting latch
                    latch.add();
                    var sortLatch = new CallbackLatch();

                    // Put the players in the array with their sort value
                    affectPlayers.forEach(function(player) {
                        // Create a player object
                        var playerObject = {
                            player,
                            value: 0
                        };

                        // Select the getter function to use for the value
                        var getter = null;
                        switch(properties.filters.playerRange.orderBy) {
                            case 'money':
                                getter = player.getMoney;
                                break;

                            case 'in':
                                getter = player.getIn;
                                break;

                            case 'out':
                                getter = player.getOut;
                                break;

                            case 'strength':
                                getter = player.getStrength;
                                break;

                            case 'random':
                            default:
                                getter = (callback) => callback(null, Math.random());
                                break;
                        }

                        // Get the actual value
                        sortLatch.add();
                        getter.call(player, function(err, value) {
                            // Call back errors
                            if(err !== null) {
                                if(!calledBack)
                                    callback(err);
                                calledBack = true;
                                return;
                            }

                            // Set the value and add the object to the list
                            playerObject.value = value;
                            playerSort.push(playerObject);

                            // Resolve the sorting latch
                            sortLatch.resolve();
                        });
                    });

                    // Sort the values
                    sortLatch.then(function() {
                        // Determine the sort factor
                        var sortFactor = properties.filters.playerRange.order === 'asc' ? 1 : -1;

                        // Sort
                        playerSort.sort((a, b) => (a.value - b.value) * sortFactor);

                        // Slice the array to limit the players
                        playerSort = playerSort.slice(0, properties.filters.playerRange.limit);

                        // Update the main list of users and map them back
                        affectPlayers = playerSort.map((obj) => obj.player);

                        // Resolve the main latch
                        latch.resolve();
                    });
                }

                // Continue
                latch.then(function() {
                    // Reset the latch to it's identity
                    latch.identity();

                    // Check whether a team range is specified
                    if(_.has(properties, 'filters.teamRange.limit') && _.isInteger(properties.filters.teamRange.limit)
                        && _.has(properties, 'filters.teamRange.orderBy') && _.isString(properties.filters.teamRange.orderBy)) {
                        // Set the default sorting order, and make sure it's valid
                        if(properties.filters.teamRange.order === undefined)
                            properties.filters.teamRange.order = 'desc';
                        if(!_.includes(ORDER_OPTIONS, properties.filters.teamRange.order)) {
                            if(!calledBack)
                                callback(new Error('Invalid sorting order'));
                            calledBack = true;
                            return;
                        }

                        // Make sure the order by value is valid
                        if(!_.includes(TEAM_ORDER_BY_OPTIONS, properties.filters.teamRange.orderBy)) {
                            if(!calledBack)
                                callback(new Error('Invalid order by value, value not supported'));
                            calledBack = true;
                            return;
                        }

                        // Make sure the limit is is at least one or higher
                        if(properties.filters.teamRange.limit <= 0) {
                            if(!calledBack)
                                callback(new Error('Invalid team range limit, must be at least 1 or higher'));
                            calledBack = true;
                            return;
                        }

                        // Create a new array with the value to sort on
                        var teamSort = [];

                        // Create a sorting latch
                        latch.add();
                        var sortLatch = new CallbackLatch();

                        // Put the teams in the array with their sort value
                        teams.forEach(function(team) {
                            // Create a team object
                            var teamObject = {
                                team,
                                value: 0
                            };

                            // Select the getter function to use for the value
                            var getter = null;
                            switch(properties.filters.teamRange.orderBy) {
                                case 'money':
                                    getter = team.getTeamMoney;
                                    break;

                                case 'factory':
                                    getter = team.getTeamFactoryCount;
                                    break;

                                case 'in':
                                    getter = (callback) => team.getTeamIn(true, false, callback);
                                    break;

                                case 'out':
                                    getter = (callback) => team.getTeamOut(true, false, callback);
                                    break;

                                case 'strength':
                                    getter = team.getTeamStrength;
                                    break;

                                case 'defence':
                                    getter = team.getTeamDefence;
                                    break;

                                case 'random:':
                                default:
                                    getter = (callback) => callback(null, Math.random());
                                    break;
                            }

                            // Get the actual value
                            sortLatch.add();
                            getter.call(team, function(err, value) {
                                // Call back errors
                                if(err !== null) {
                                    if(!calledBack)
                                        callback(err);
                                    calledBack = true;
                                    return;
                                }

                                // Set the value and add the object to the list
                                teamObject.value = value;
                                teamSort.push(teamObject);

                                // Resolve the sorting latch
                                sortLatch.resolve();
                            });
                        });

                        // Sort the values
                        sortLatch.then(function() {
                            // Reset the identity of the latch
                            sortLatch.identity();

                            // Determine the sort factor
                            var sortFactor = properties.filters.teamRange.order === 'asc' ? 1 : -1;

                            // Sort
                            teamSort.sort((a, b) => (a.value - b.value) * sortFactor);

                            // Slice the array to limit the teams
                            teamSort = teamSort.slice(0, properties.filters.teamRange.limit);

                            // Create a list of team IDs
                            var teamIds = [];
                            teamSort.forEach(function(team) {
                                teamIds.push(team.team.getIdHex());
                            });

                            // Create a list with new filtered players
                            var teamRangeFiltered = [];

                            // Process each player
                            affectPlayers.forEach(function(player) {
                                sortLatch.add();

                                // Check whether the player is in the given team
                                player.getTeam(function(err, team) {
                                    // Call back errors
                                    if(err !== null) {
                                        if(!calledBack)
                                            callback(err);
                                        calledBack = true;
                                        return;
                                    }

                                    // Return early if this player doesn't have a team
                                    if(team === null) {
                                        sortLatch.resolve();
                                        return;
                                    }

                                    // Add the player to the filtered list
                                    if(_.includes(teamIds, team.getIdHex()))
                                        teamRangeFiltered.push(player);

                                    // Resolve the latch
                                    sortLatch.resolve();
                                });
                            });

                            // Continue when the filtering is done
                            sortLatch.then(function() {
                                // Update the main list of users
                                affectPlayers = teamRangeFiltered;

                                // Resolve the main latch
                                latch.resolve();
                            });
                        });
                    }

                    // Continue
                    latch.then(function() {
                        // Reset the latch to it's identity
                        latch.identity();

                        // Define the range side options
                        const RANGE_SIDE_OPTIONS = [ 'inside', 'outside' ];

                        // Check whether to filter by range
                        if(_.has(properties, 'filters.range.range') && _.isInteger(properties.filters.range.range)) {
                            // Make the range positive
                            properties.filters.range.range = Math.abs(properties.filters.range.range);

                            // Use the default side value if not set, and make sure it's valid
                            if(properties.filters.range.side === undefined)
                                properties.filters.range.side = 'inside';
                            if(!_.includes(RANGE_SIDE_OPTIONS, properties.filters.range.side)) {
                                if(!calledBack)
                                    callback(new Error('Invalid range side value, value not supported'));
                                calledBack = true;
                                return;
                            }

                            // Create a range filter latch
                            latch.add();
                            var rangeLatch = new CallbackLatch();

                            // Create a list of filtered players
                            var rangeFiltered = [];

                            // Get the range for each player
                            affectPlayers.forEach(function(player) {
                                rangeLatch.add();

                                // Filter users that don't have any known location
                                if(!player.hasLocation()) {
                                    rangeLatch.resolve();
                                    return;
                                }

                                // Calculate the of the player to the custom action executor
                                const distance = player.getLocation().getDistanceTo(location);

                                // Determine whether to filter the player or not
                                if((properties.filters.range.side === 'inside' && distance <= properties.filters.range.range) ||
                                    (properties.filters.range.side === 'outside' && distance >= properties.filters.range.range))
                                    rangeFiltered.push(player);

                                // Resolve the range latch
                                rangeLatch.resolve();
                            });

                            // Set the list to the filtered players
                            rangeLatch.then(function() {
                                // Set the list
                                affectPlayers = rangeFiltered;

                                // Resolve the main latch
                                latch.resolve();
                            });
                        }

                        // Continue when we're done
                        latch.then(function() {
                            // Reset the latch to it's identity
                            latch.identity();

                            // Limit the number of players
                            if(_.has(properties, 'filters.playerLimit.limit') && _.isInteger(properties.filters.playerLimit.limit))
                                affectPlayers = affectPlayers.slice(0, properties.filters.playerLimit.limit);

                            const CHANGE_METHOD_OPTIONS = [ 'add', 'subtract', 'set' ];
                            const CHANGE_TYPE_OPTIONS = [ 'fixed', 'percentage' ];

                            // Get the method, type and amount
                            const changeMethod = properties.amounts.method;
                            const changeType = properties.amounts.type;
                            const changeAmount = properties.amounts.amount;

                            // Make sure the method and type are valid
                            if(!_.includes(CHANGE_METHOD_OPTIONS, changeMethod)
                                || !_.includes(CHANGE_TYPE_OPTIONS, changeType)) {
                                if(!calledBack)
                                    callback(new Error('Invalid method or type value for the amounts.'));
                                calledBack = true;
                                return;
                            }

                            // Make sure the amount is valid
                            if(!_.isInteger(changeAmount) || changeAmount <= 0) {
                                if(!calledBack)
                                    callback(new Error('Invalid change amount'));
                                calledBack = true;
                                return;
                            }

                            // Create an affect latch
                            var affectLatch = new CallbackLatch();

                            // Define a unit change callback
                            var unitChangeCallback = function(err) {
                                // Call back errors
                                if(err !== null) {
                                    if(!calledBack)
                                        callback(err);
                                    calledBack = true;
                                    return;
                                }

                                // Resolve the latch
                                affectLatch.resolve();
                            };

                            // Loop through the players
                            affectPlayers.forEach(function(player) {
                                // Process the money
                                if(properties.units.money) {
                                    affectLatch.add();
                                    game._processPlayerUnitChange(player, player.getMoney, player.setMoney, changeMethod, changeType, changeAmount, unitChangeCallback);
                                }
                                
                                // Process the in units
                                if(properties.units.in) {
                                    affectLatch.add();
                                    game._processPlayerUnitChange(player, player.getIn, player.setIn, changeMethod, changeType, changeAmount, unitChangeCallback);
                                }

                                // Process the out units
                                if(properties.units.out) {
                                    affectLatch.add();
                                    game._processPlayerUnitChange(player, player.getOut, player.setOut, changeMethod, changeType, changeAmount, unitChangeCallback);
                                }
                            });

                            // Continue when the values have been changed
                            affectLatch.then(function() {
                                // Check whether a message should be sent
                                if(properties.message.type !== 'none') {
                                    // Define a message to send
                                    var affectMessage = '';

                                    // Use a custom message
                                    if(properties.message.type === 'custom')
                                        affectMessage = properties.message.customMessage.replace('\n', '<br \>');
                                    if(affectMessage.trim().length <= 0)
                                        affectMessage = 'Your inventory has been affected by a special power!';

                                    // Loop through the players to broadcast the message
                                    affectPlayers.forEach(function(player) {
                                        // Send a notification to the user
                                        Core.realTime.packetProcessor.sendPacketUser(PacketType.MESSAGE_RESPONSE, {
                                            error: false,
                                            message: affectMessage,
                                            dialog: true,
                                            toast: false
                                        }, player);
                                    });
                                }

                                // Send the updated game data to everyone
                                Core.gameManager.sendGameDataToAll(game.getGameModel(), function(err) {
                                    // Notify the user for errors
                                    if(err !== null) {
                                        console.error('Failed to send game data update to all users');
                                        console.error(err);

                                        // Send a success message to the executor
                                        Core.realTime.packetProcessor.sendPacketUser(PacketType.MESSAGE_RESPONSE, {
                                            error: true,
                                            message: 'An error occurred while updating the game data for all players.<br><br>This error has been ignored.',
                                            dialog: true,
                                            toast: false
                                        }, user);
                                    }
                                });

                                // Determine what executor message to show
                                var executorMessage = 'No players affected!';
                                if(affectPlayers.length > 0)
                                    executorMessage = 'Affected ' + affectPlayers.length + ' player' + (affectPlayers.length !== 1 ? 's' : '') + '...';

                                // Send a success message to the executor
                                Core.realTime.packetProcessor.sendPacketUser(PacketType.MESSAGE_RESPONSE, {
                                    error: false,
                                    message: executorMessage,
                                    dialog: false,
                                    toast: true
                                }, user);

                                // Call back success
                                if(!calledBack)
                                    callback(null);
                            });
                        });
                    });
                });
            });
        });
    });
};

/**
 * Special custom action properties object definition.
 * This object defines the behaviour of a special custom action.
 *
 * @typedef {Object} SpecialCustomActionPropertiesObject
 *
 * @param {int} [filters.playerRange.limit] The amount of players to include in this range.
 * @param {string} [filters.playerRange.order='desc'] The ordering to use, ascending or descending. ('asc', 'desc')
 * @param {string} [filters.playerRange.orderBy] The unit to order by. ('money', 'in', 'out', 'strength', 'random')
 * @param {int} [filters.teamRange.limit] The amount of teams to include in this range.
 * @param {string} [filters.teamRange.order] The ordering to use, ascending or descending. ('asc', 'desc')
 * @param {string} [filters.teamRange.orderBy] The unit to order by. ('money', 'factory', 'in', 'out', 'strength', 'random')
 * @param {string[]} [filters.specificPlayers.players] A list of user IDs to use, the rest is dropped.
 * @param {string[]} [filters.specificTeams.teams] A list of team IDs to use, the rest is dropped.
 * @param {int} [filters.range.range] The range the players must be inside or outside of.
 * @param {string} [filters.range.side] The side of the range the players must be inside or outside of. ('inside', 'outside')
 * @param {int} [filters.playerLimit.limit] Maximum player limit if there is any limit.
 * @param {boolean} units.in True to modify the in units of players.
 * @param {boolean} units.out True to modify the out units of players.
 * @param {boolean} units.money True to modify the money units of players.
 * @param {string} amounts.method Algorithmic method. ('add', 'subtract', 'set')
 * @param {string} amounts.type Type of unit amount processing by this action. ('fixed', 'percentage')
 * @param {int} amounts.amount Amount.
 * @param {string} [message.method='dynamic'] Message type to show. ('dynamic', 'custom', 'none')
 * @param {string} [message.customMessage] A custom message to show when the message type is set to 'custom'.
 */

/**
 * Process a unit change for the given player.
 *
 * @param {User} liveUser The live user instance of the player to change the value for.
 * @param {function} getter The current value getter function.
 * @param {function} setter The value setter function.
 * @param {string} changeMethod The method to change, see {@see SpecialCustomActionPropertiesObject.amounts.method}.
 * @param {string} changeType The type to change, see {@see SpecialCustomActionPropertiesObject.amounts.type}.
 * @param {int} changeAmount The change amount, which is a fixed value or a percentage.
 * @param {Game~_processPlayerUnitChangeCallback} callback Called on success or when an error occurred.
 */
Game.prototype._processPlayerUnitChange = function(liveUser, getter, setter, changeMethod, changeType, changeAmount, callback) {
    // Create a latch
    var latch = new CallbackLatch();

    // Define a variable for the current value
    var current = 0;

    // Check whether to get the current value
    if(changeMethod !== 'set') {
        latch.add();
        getter.call(liveUser, function(err, value) {
            // Call back errors
            if(err !== null) {
                callback(err);
                return;
            }

            // Set the value
            current = value;

            // Resolve the latch
            latch.resolve();
        });
    }

    // Continue when we're done
    latch.then(function() {
        // Just set the value
        if(changeMethod === 'set')
            current = changeAmount;
        
        else {
            // Determine the delta change value
            var delta = 0;
            if(changeType === 'fixed')
                delta = changeAmount;
            else
                delta = Math.round((changeAmount / 100) * current);

            // Absolute the value
            delta = Math.abs(delta);

            // Negate the delta if we want to subtract
            if(changeMethod === 'subtract')
                delta *= -1;

            // Add the delta to the current value
            current += delta;
        }

        // Make sure the current value is at least zero
        if(current < 0)
            current = 0;

        // Set the value
        setter.call(liveUser, current, callback);
    });
};

/**
 * Called on success or when an error occurred.
 *
 * @callback Game~_processPlayerUnitChangeCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

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
