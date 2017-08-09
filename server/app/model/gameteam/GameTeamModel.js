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

var Core = require('../../../Core');
var GameTeamDatabase = require('./GameTeamDatabase');
var BaseModel = require('../../database/BaseModel');
var CallbackLatch = require('../../util/CallbackLatch');

/**
 * GameTeamModel class.
 *
 * @class
 * @constructor
 *
 * @param {ObjectId} id Game team ID object.
 *
 * @returns {GameTeamModel} Game team instance.
 */
var GameTeamModel = function(id) {
    /**
     * Set the API application ID.
     *
     * @private
     */
    this._id = id;

    // Create and configure the base model instance for this model
    this._baseModel = new BaseModel(this, {
        mongo: {
            collection: GameTeamDatabase.DB_COLLECTION_NAME
        },
        fields: {
            game: {
                mongo: {
                    field: 'game_id',

                    /**
                     * Convert an ID to an Game model.
                     *
                     * @param {ObjectId} id
                     * @return {GameModel} Game.
                     */
                    from: (id) => Core.model.gameModelManager._instanceManager.create(id),

                    /**
                     * Convert an Game model to an ID.
                     *
                     * @param {GameModel} game Game.
                     * @return {ObjectId} ID.
                     */
                    to: (game) => game.getId()
                },
                redis: {
                    /**
                     * Convert a hexadecimal ID to a Game model.
                     *
                     * @param {String} id
                     * @return {GameModel} Game.
                     */
                    from: (id) => Core.model.gameModelManager._instanceManager.create(id),

                    /**
                     * Convert an Game model to a hexadecimal ID.
                     *
                     * @param {GameModel} game Game.
                     * @return {String} Hexadecimal ID.
                     */
                    to: (game) => game.getIdHex()
                }
            },
            name: {}
        }
    });
};

/**
 * Get the ID object of the game.
 *
 * @returns {ObjectId} Game ID object.
 */
GameTeamModel.prototype.getId = function() {
    return this._id;
};

/**
 * Get the hexadecimal ID representation of the game.
 *
 * @returns {*} Game ID as hexadecimal string.
 */
GameTeamModel.prototype.getIdHex = function() {
    return this.getId().toString();
};

/**
 * Get the given field from the model.
 *
 * @param {String} field Field names.
 * @param {GameTeamModel~getFieldCallback} callback Called with the result of a model field, or when an error occurred.
 */
GameTeamModel.prototype.getField = function(field, callback) {
    this._baseModel.getField(field, callback);
};

/**
 * Called with the result of a model field, or when an error occurred.
 *
 * @callback GameModel~getFieldCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {*=} Field value.
 */

/**
 * Set the given field to the given value for this model.
 *
 * @param {String} field Field name.
 * @param {*} value Field value.
 * @param {GameTeamModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
GameTeamModel.prototype.setField = function(field, value, callback) {
    this._baseModel.setField(field, value, callback);
};

/**
 * Called on success, or when an error occurred.
 *
 * @callback GameModel~setFieldCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Set the given fields to the given values.
 *
 * @param {Object} fields Object with key value pairs.
 * @param {GameTeamModel~setFieldsCallback} callback Called on success, or when an error occurred.
 */
GameTeamModel.prototype.setFields = function(fields, callback) {
    this._baseModel.setFields(fields, callback);
};

/**
 * Called on success, or when an error occurred.
 *
 * @callback GameTeamModel~setFieldsCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Get the game.
 *
 * @param {GameTeamModel~getGameCallback} callback Called with the game or when an error occurred.
 */
GameTeamModel.prototype.getGame = function(callback) {
    this.getField('game', callback);
};

/**
 * Called with the game or when an error occurred.
 *
 * @callback GameModel~getGameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {GameModel} Game.
 */

/**
 * Set the game.
 *
 * @param {GameModel} game Game.
 * @param {GameTeamModel~setFieldCallback} callback Called on success or when an error occurred.
 */
GameTeamModel.prototype.setGame = function(game, callback) {
    this.setField('game', game, callback);
};

/**
 * Get the name of the team.
 *
 * @param {GameTeamModel~getNameCallback} callback Called with the name or when an error occurred.
 */
GameTeamModel.prototype.getName = function(callback) {
    this.getField('name', callback);
};

/**
 * Called with the name or when an error occurred.
 *
 * @callback GameTeamModel~getNameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {string=} Team name.
 */

/**
 * Set the name of the team.
 *
 * @param {String} name Team name..
 * @param {GameTeamModel~setFieldCallback} callback Called on success or when an error occurred.
 */
GameTeamModel.prototype.setName = function(name, callback) {
    this.setField('name', name, callback);
};

/**
 * Get the users that are in this team.
 *
 * @param {GameTeamModel~getUsersCallback} callback Called with the result or when an error occurred.
 */
GameTeamModel.prototype.getUsers = function(callback) {
    Core.model.gameUserModelManager.getTeamUsers(this.getId(), callback);
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback GameTeamModel~getUsersCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {UserModel[]=} An array of user models that are in the team.
 */

/**
 * Get the game users that are in this team.
 *
 * @param {GameTeamModel~getGameUsersCallback} callback Called with the result or when an error occurred.
 */
GameTeamModel.prototype.getGameUsers = function(callback) {
    Core.model.gameUserModelManager.getTeamGameUsers(this.getId(), callback);
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback GameTeamModel~getGameUsersCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {GameUserModel[]=} An array of game user models that are in the team.
 */

/**
 * Get the number of users that are in this team.
 *
 * @param {GameTeamModel~getUserCountCallback} callback Called with the result or when an error occurred.
 */
GameTeamModel.prototype.getUserCount = function(callback) {
    Core.model.gameUserModelManager.getTeamUserCount(this.getId(), callback);
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback GameTeamModel~getUserCountCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Number=} Number of users in this team.
 */

/**
 * Get the money this team has in total.
 * Money that players have in their inventory is counted.
 *
 * @param {GameTeamModel~getTeamMoneyCallback} callback Called back with the result or when an error occurred.
 */
GameTeamModel.prototype.getTeamMoney = function(callback) {
    // Keep a reference to this
    const self = this;

    // Get the game
    this.getGame(function(err, game) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Get the list of users in this team
        self.getUsers(function(err, users) {
            // Call back errors
            if(err !== null) {
                callback(err);
                return;
            }

            // Create a variable to sum up the money in
            var money = 0;

            // Create a callback latch
            var latch = new CallbackLatch();
            var calledBack = false;

            // Loop through the users and sum up their money
            users.forEach(function(user) {
                // Add the latch
                latch.add();

                // Get the game user
                Core.model.gameUserModelManager.getGameUser(game, user, function(err, gameUser) {
                    // Call back errors
                    if(err !== null) {
                        if(!calledBack)
                            callback(err);
                        calledBack = true;
                        return;
                    }

                    // Return early if we don't know the game user
                    if(gameUser === null) {
                        latch.resolve();
                        return;
                    }

                    // Get the user's money
                    gameUser.getMoney(function(err, userMoney) {
                        // Call back errors
                        if(err !== null) {
                            if(!calledBack)
                                callback(err);
                            calledBack = true;
                            return;
                        }

                        // Sum up the money
                        money += userMoney;

                        // Resolve the latch
                        latch.resolve();
                    });
                });
            });

            // Call back when we're done
            latch.then(function() {
                if(!calledBack)
                    callback(null, Math.round(money));
            });
        });
    });
};

/**
 * Called back with the result or when an error occurred.
 *
 * @callback GameTeamModel~getTeamMoneyCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 * @param {int} [money=] The money this team has.
 */

/**
 * Get the in units this team has in total.
 * Units that are in the inventory of players, and that are inside factories are counted depending on the function
 * parameters.
 *
 * @param {boolean} includeFromPlayers Include units that team players have in their inventory.
 * @param {boolean} includeFromFactories Include units that team players have in factories they own.
 * @param {GameTeamModel~getTeamInCallback} callback Called back with the result or when an error occurred.
 */
GameTeamModel.prototype.getTeamIn = function(includeFromPlayers, includeFromFactories, callback) {
    // Store a reference to this
    const self = this;

    // Create a variable to sum up the in units
    var units = 0;

    // Create a callback latch
    var latch = new CallbackLatch();
    var calledBack = false;

    // Include units in player inventories
    if(includeFromPlayers) {
        latch.add();
        this.getGame(function(err, game) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Get the users
            self.getUsers(function(err, users) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Loop through the users and sum up their units
                users.forEach(function(user) {
                    // Add the latch
                    latch.add();

                    // Get the game user
                    Core.model.gameUserModelManager.getGameUser(game, user, function(err, gameUser) {
                        // Call back errors
                        if(err !== null) {
                            if(!calledBack)
                                callback(err);
                            calledBack = true;
                            return;
                        }

                        // Return early if we don't know the game user
                        if(gameUser === null) {
                            latch.resolve();
                            return;
                        }

                        // Get the user's units
                        gameUser.getIn(function(err, contents) {
                            // Call back errors
                            if(err !== null) {
                                if(!calledBack)
                                    callback(err);
                                calledBack = true;
                                return;
                            }

                            // Sum up the units
                            units += contents;

                            // Resolve the latch
                            latch.resolve();
                        });
                    });
                });

                // Resolve the latch
                latch.resolve();
            });
        });
    }

    // Include units inside team factories
    if(includeFromFactories) {
        // Get the factories for this team
        latch.add();
        self.getTeamFactories(function(err, factories) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Loop through the factories
            factories.forEach(function(factory) {
                // Increase the latch count
                latch.add();

                // Get the units inside the factory
                factory.getIn(function(err, contents) {
                    // Call back errors
                    if(err !== null) {
                        if(!calledBack)
                            callback(err);
                        calledBack = true;
                        return;
                    }

                    // Sum up the contents
                    units += contents;

                    // Resolve the latch
                    latch.resolve();
                });
            });

            // Resolve the latch
            latch.resolve();
        });
    }

    // Call back when we're done
    latch.then(function() {
        if(!calledBack)
            callback(null, Math.round(units));
    });
};

/**
 * Called back with the result or when an error occurred.
 *
 * @callback GameTeamModel~getTeamInCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 * @param {int} [units=] The amount of in units this team has.
 */

/**
 * Get the out units this team has out total.
 * Units that are in the inventory of players, and that are inside factories are counted depending on the function
 * parameters.
 *
 * @param {boolean} includeFromPlayers Include units that team players have in their inventory.
 * @param {boolean} includeFromFactories Include units that team players have in factories they own.
 * @param {GameTeamModel~getTeamOutCallback} callback Called back with the result or when an error occurred.
 */
GameTeamModel.prototype.getTeamOut = function(includeFromPlayers, includeFromFactories, callback) {
    // Store a reference to this
    const self = this;

    // Create a variable to sum up the in units
    var units = 0;

    // Create a callback latch
    var latch = new CallbackLatch();
    var calledBack = false;

    // Include units in player inventories
    if(includeFromPlayers) {
        latch.add();
        this.getGame(function(err, game) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Get the users
            self.getUsers(function(err, users) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Loop through the users and sum up their units
                users.forEach(function(user) {
                    // Add the latch
                    latch.add();

                    // Get the game user
                    Core.model.gameUserModelManager.getGameUser(game, user, function(err, gameUser) {
                        // Call back errors
                        if(err !== null) {
                            if(!calledBack)
                                callback(err);
                            calledBack = true;
                            return;
                        }

                        // Return early if we don't know the game user
                        if(gameUser === null) {
                            latch.resolve();
                            return;
                        }

                        // Get the user's units
                        gameUser.getOut(function(err, contents) {
                            // Call back errors
                            if(err !== null) {
                                if(!calledBack)
                                    callback(err);
                                calledBack = true;
                                return;
                            }

                            // Sum up the units
                            units += contents;

                            // Resolve the latch
                            latch.resolve();
                        });
                    });
                });

                // Resolve the latch
                latch.resolve();
            });
        });
    }

    // Include units inside team factories
    if(includeFromFactories) {
        // Get the factories for this team
        latch.add();
        self.getTeamFactories(function(err, factories) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Loop through the factories
            factories.forEach(function(factory) {
                // Increase the latch count
                latch.add();

                // Get the units inside the factory
                factory.getOut(function(err, contents) {
                    // Call back errors
                    if(err !== null) {
                        if(!calledBack)
                            callback(err);
                        calledBack = true;
                        return;
                    }

                    // Sum up the contents
                    units += contents;

                    // Resolve the latch
                    latch.resolve();
                });
            });

            // Resolve the latch
            latch.resolve();
        });
    }

    // Call back when we're done
    latch.then(function() {
        if(!calledBack)
            callback(null, Math.round(units));
    });
};

/**
 * Called back with the result or when an error occurred.
 *
 * @callback GameTeamModel~getTeamOutCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 * @param {int} [units=] The amount of out units this team has.
 */

/**
 * Get the strength this team has in total.
 * Strength of players in the team is counted.
 *
 * @param {GameTeamModel~getTeamStrengthCallback} callback Called back with the result or when an error occurred.
 */
GameTeamModel.prototype.getTeamStrength = function(callback) {
    // Keep a reference to this
    const self = this;

    // Get the current game
    this.getGame(function(err, game) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Get the list of users in this team
        self.getUsers(function(err, users) {
            // Call back errors
            if(err !== null) {
                callback(err);
                return;
            }

            // Create a variable to sum up the strength in
            var strength = 0;

            // Create a callback latch
            var latch = new CallbackLatch();
            var calledBack = false;

            // Loop through the users and sum up their strength
            users.forEach(function(user) {
                // Add the latch
                latch.add();

                // Get the game user
                Core.model.gameUserModelManager.getGameUser(game, user, function(err, gameUser) {
                    // Call back errors
                    if(err !== null) {
                        if(!calledBack)
                            callback(err);
                        calledBack = true;
                        return;
                    }

                    // Return early if we don't know the game user
                    if(gameUser === null) {
                        latch.resolve();
                        return;
                    }

                    // Get the user's strength
                    gameUser.getStrength(function(err, userStrength) {
                        // Call back errors
                        if(err !== null) {
                            if(!calledBack)
                                callback(err);
                            calledBack = true;
                            return;
                        }

                        // Sum up the strength
                        strength += userStrength;

                        // Resolve the latch
                        latch.resolve();
                    });
                });
            });

            // Call back when we're done
            latch.then(function() {
                if(!calledBack)
                    callback(null, Math.round(strength));
            });
        });
    });
};

/**
 * Called back with the result or when an error occurred.
 *
 * @callback GameTeamModel~getTeamStrengthCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 * @param {int} [strength=] The strength this team has.
 */

/**
 * Get the defence this team has in total on their factories.
 * Defence is counted for each factory this team owns.
 *
 * @param {GameTeamModel~getTeamDefenceCallback} callback Called back with the result or when an error occurred.
 */
GameTeamModel.prototype.getTeamDefence = function(callback) {
    // Get the list of factories this team owns
    this.getTeamFactories(function(err, factories) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Create a variable to sum up the defence in
        var defence = 0;

        // Create a callback latch
        var latch = new CallbackLatch();
        var calledBack = false;

        // Loop through the factories and sum up their defence
        factories.forEach(function(factory) {
            // Add the latch
            latch.add();

            factory.getDefence(function(err, factoryDefence) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Sum up the defence
                defence += factoryDefence;

                // Resolve the latch
                latch.resolve();
            });
        });

        // Call back when we're done
        latch.then(function() {
            if(!calledBack)
                callback(null, Math.round(defence));
        });
    });
};

/**
 * Called back with the result or when an error occurred.
 *
 * @callback GameTeamModel~getTeamDefenceCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 * @param {int} [defence=] The defence this team has.
 */

/**
 * Get the factories this team has.
 *
 * @param {GameTeamModel~getTeamFactoriesCallback} callback Called with the result or when an error occurred.
 */
GameTeamModel.prototype.getTeamFactories = function(callback) {
    Core.model.factoryModelManager.getFactories(null, null, this, callback);
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback GameTeamModel~getTeamFactoriesCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {FactoryModel[]} An array of factories.
 */

/**
 * Get the number of factories this team has.
 *
 * @param {GameTeamModel~getTeamFactoryCountCallback} callback Called with the result or when an error occurred.
 */
GameTeamModel.prototype.getTeamFactoryCount = function(callback) {
    this.getTeamFactories(function(err, factories) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Count and call back
        callback(null, factories.length);
    })
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback GameTeamModel~getTeamFactoryCountCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {int} The number of factories the team has.
 */

/**
 * Delete the game team.
 *
 * @param {GameTeamModel~deleteCallback} [callback] Called on success, or when an error occurred.
 */
GameTeamModel.prototype.delete = function(callback) {
    this._baseModel.flush(undefined, function(err) {
        // Call back errors
        if(err !== null) {
            if(callback !== undefined)
                callback(err);
            return;
        }

        // Flush the model manager
        Core.model.gameTeamModelManager.flushCache(function(err) {
            if(callback !== undefined)
                callback(err);
        });
    });
};

/**
 * Called on success, or when an error occurred.
 *
 * @callback GameTeamModel~deleteCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

// Export the user class
module.exports = GameTeamModel;
