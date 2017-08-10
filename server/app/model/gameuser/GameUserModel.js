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
var GameUserDatabase = require('./GameUserDatabase');
var BaseModel = require('../../database/BaseModel');
var CallbackLatch = require('../../util/CallbackLatch');

/**
 * GameUserModel class.
 *
 * @class
 * @constructor
 *
 * @param {ObjectId} id Game user ID object.
 *
 * @returns {GameUserModel} Game user instance.
 */
var GameUserModel = function(id) {
    /**
     * Set the API application ID.
     *
     * @private
     */
    this._id = id;

    // Create and configure the base model instance for this model
    this._baseModel = new BaseModel(this, {
        mongo: {
            collection: GameUserDatabase.DB_COLLECTION_NAME
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
            user: {
                mongo: {
                    field: 'user_id',

                    /**
                     * Convert an ID to an User model.
                     *
                     * @param {ObjectId} id
                     * @return {UserModel} User.
                     */
                    from: (id) => Core.model.userModelManager._instanceManager.create(id),

                    /**
                     * Convert an User model to an ID.
                     *
                     * @param {UserModel} user User.
                     * @return {ObjectId} ID.
                     */
                    to: (user) => user.getId()
                },
                redis: {
                    /**
                     * Convert a hexadecimal ID to a User model.
                     *
                     * @param {String} id
                     * @return {UserModel} User.
                     */
                    from: (id) => Core.model.userModelManager._instanceManager.create(id),

                    /**
                     * Convert an User model to a hexadecimal ID.
                     *
                     * @param {UserModel} user User.
                     * @return {String} Hexadecimal ID.
                     */
                    to: (user) => user.getIdHex()
                }
            },
            team: {
                mongo: {
                    field: 'team_id',

                    /**
                     * Convert an ID to an Game Team model.
                     *
                     * @param {ObjectId} id
                     * @return {GameTeamModel} Game Team.
                     */
                    from: (id) => id !== null ? Core.model.gameTeamModelManager._instanceManager.create(id) : null,

                    /**
                     * Convert an Game Team model to an ID.
                     *
                     * @param {GameTeamModel} team Game Team.
                     * @return {ObjectId} ID.
                     */
                    to: (team) => team !== null ? team.getId() : null
                },
                redis: {
                    /**
                     * Convert a hexadecimal ID to a Game Team model.
                     *
                     * @param {String} id
                     * @return {GameTeamModel} Team.
                     */
                    from: (id) => id !== '' ? Core.model.gameTeamModelManager._instanceManager.create(id) : null,

                    /**
                     * Convert an Game Team model to a hexadecimal ID.
                     *
                     * @param {GameTeamModel} team Game Team.
                     * @return {String} Hexadecimal ID.
                     */
                    to: (team) => team !== null ? team.getIdHex() : ''
                }
            },
            is_special: {
                redis: {
                    /**
                     * Convert the string value to a boolean.
                     *
                     * @param {string} bool Boolean as a string.
                     * @return {boolean} Boolean value.
                     */
                    from: (bool) => bool !== '0',

                    /**
                     * Convert the boolean value to a string.
                     *
                     * @param {boolean} bool Boolean value.
                     * @return {string} Boolean as a string.
                     */
                    to: (bool) => bool ? 1 : 0
                }
            },
            is_spectator: {
                redis: {
                    /**
                     * Convert the string value to a boolean.
                     *
                     * @param {string} bool Boolean as a string.
                     * @return {boolean} Boolean value.
                     */
                    from: (bool) => bool !== '0',

                    /**
                     * Convert the boolean value to a string.
                     *
                     * @param {boolean} bool Boolean value.
                     * @return {string} Boolean as a string.
                     */
                    to: (bool) => bool ? 1 : 0
                }
            },
            money: {
                mongo: {
                    from: function(raw) {
                        // Parse the value
                        var value = parseInt(raw);

                        // Return zero if the value is invalid
                        if(value === 0 || isNaN(value))
                            return 0;

                        // Return the value
                        return value;
                    }
                },
                redis: {
                    from: function(raw) {
                        // Parse the value
                        var value = parseInt(raw);

                        // Return zero if the value is invalid
                        if(value === 0 || isNaN(value))
                            return 0;

                        // Return the value
                        return value;
                    },
                    to: (value) => value.toString()
                }
            },
            in: {
                redis: {
                    from: (raw) => parseInt(raw),
                    to: (value) => value.toString()
                }
            },
            out: {
                redis: {
                    from: (raw) => parseInt(raw),
                    to: (value) => value.toString()
                }
            },
            strength: {
                redis: {
                    from: (raw) => parseInt(raw),
                    to: (value) => value.toString()
                }
            }
        }
    });
};

/**
 * Get the ID object of the game.
 *
 * @returns {ObjectId} Game ID object.
 */
GameUserModel.prototype.getId = function() {
    return this._id;
};

/**
 * Get the hexadecimal ID representation of the game.
 *
 * @returns {*} Game ID as hexadecimal string.
 */
GameUserModel.prototype.getIdHex = function() {
    return this.getId().toString();
};

/**
 * Get the given field from the model.
 *
 * @param {String} field Field names.
 * @param {GameUserModel~getFieldCallback} callback Called with the result of a model field, or when an error occurred.
 * @param {Object} options Model options.
 */
GameUserModel.prototype.getField = function(field, callback, options) {
    this._baseModel.getField(field, callback, options);
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
 * @param {GameUserModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
GameUserModel.prototype.setField = function(field, value, callback) {
    this._baseModel.setField(field, value, callback);
};

/**
 * Called on success, or when an error occurred.
 *
 * @callback GameUserModel~setFieldCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Set the given fields to the given values.
 *
 * @param {Object} fields Object with key value pairs.
 * @param {GameUserModel~setFieldsCallback} callback Called on success, or when an error occurred.
 */
GameUserModel.prototype.setFields = function(fields, callback) {
    this._baseModel.setFields(fields, callback);
};

/**
 * Called on success, or when an error occurred.
 *
 * @callback GameUserModel~setFieldsCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Get the game.
 *
 * @param {GameUserModel~getGameCallback} callback Called with the game or when an error occurred.
 */
GameUserModel.prototype.getGame = function(callback) {
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
 * @param {GameUserModel~setFieldCallback} callback Called on success or when an error occurred.
 */
GameUserModel.prototype.setGame = function(game, callback) {
    this.setField('game', game, callback);
};

/**
 * Get the user.
 *
 * @param {GameUserModel~getUserCallback} callback Called with the user or when an error occurred.
 */
GameUserModel.prototype.getUser = function(callback) {
    this.getField('user', callback);
};

/**
 * Called with the user or when an error occurred.
 *
 * @callback UserModel~getUserCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {UserModel} User.
 */

/**
 * Set the user.
 *
 * @param {UserModel} user User.
 * @param {GameUserModel~setFieldCallback} callback Called on success or when an error occurred.
 */
GameUserModel.prototype.setUser = function(user, callback) {
    this.setField('user', user, callback);
};

/**
 * Get the team.
 *
 * @param {GameUserModel~getTeamCallback} callback Called with the team or when an error occurred.
 */
GameUserModel.prototype.getTeam = function(callback) {
    this.getField('team', callback);
};

/**
 * Called with the team or when an error occurred.
 *
 * @callback GameUserModel~getTeamCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {GameTeamModel} Team.
 */

/**
 * Set the team.
 *
 * @param {GameTeamModel} team Team.
 * @param {GameTeamModel~setFieldCallback} callback Called on success or when an error occurred.
 */
GameUserModel.prototype.setTeam = function(team, callback) {
    this.setField('team', team, callback);
};

/**
 * Check whether the user is a spectator.
 *
 * @param {GameUserModel~isSpectatorCallback} callback Called with result or when an error occurred.
 */
GameUserModel.prototype.isSpectator = function(callback) {
    this.getField('is_spectator', callback);
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback GameModel~isSpectatorCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean} True if the user is a spectator, false if not.
 */

/**
 * Set whether the user is a spectator.
 *
 * @param {boolean} isSpectator True if the user is a spectator, false if not.
 * @param {GameUserModel~setFieldCallback} callback Called on success or when an error occurred.
 */
GameUserModel.prototype.setSpectator = function(isSpectator, callback) {
    this.setField('is_spectator', isSpectator, callback);
};

/**
 * Check whether the user is a special user.
 *
 * @param {GameUserModel~isSpecialCallback} callback Called with result or when an error occurred.
 */
GameUserModel.prototype.isSpecial = function(callback) {
    this.getField('is_special', callback);
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback GameModel~isSpecialCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean} True if the user is a special user, false if not.
 */

/**
 * Set whether the user is a special user.
 *
 * @param {boolean} isSpecial True if the user is a special user, false if not.
 * @param {GameUserModel~setFieldCallback} callback Called on success or when an error occurred.
 */
GameUserModel.prototype.setSpecial = function(isSpecial, callback) {
    this.setField('is_special', isSpecial, callback);
};

/**
 * Get the money the user has.
 *
 * @param {GameUserModel~getMoneyCallback} callback Called with result or when an error occurred.
 * @param {Object} options Model options.
 */
GameUserModel.prototype.getMoney = function(callback, options) {
    this.getField('money', callback, options);
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback GameUserModel~getMoneyCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Number} Money.
 */

/**
 * Set the money.
 *
 * @param {Number} amount Money amount.
 * @param {GameUserModel~setFieldCallback} callback Called on success or when an error occurred.
 */
GameUserModel.prototype.setMoney = function(amount, callback) {
    // Make sure the value isn't null, NaN or Infinite
    if(amount === null || isNaN(amount) || amount === Infinity || !_.isInteger(amount)) {
        callback(new Error('Invalid money amount: ' + amount));
        return;
    }

    // Set the field
    this.setField('money', amount, callback);
};

/**
 * Add money to the user.
 *
 * @param {Number} amount Amount to add.
 * @param {GameUserModel~addMoneyCallback} callback Called back on success or when an error occurred.
 */
GameUserModel.prototype.addMoney = function(amount, callback) {
    // Make sure the value isn't null, NaN or Infinite
    if(amount === null || isNaN(amount) || amount === Infinity || !_.isInteger(amount)) {
        callback(new Error('Invalid money amount: ' + amount));
        return;
    }

    // Show a warning if the amount to add is zero
    if(amount === 0) {
        // Print the warning
        console.warn('WARNING: Adding 0 to the money value of a user.');
        console.trace();

        // Call back
        callback(null);
        return;
    }

    // Store this instance
    const self = this;

    // Get the current money value
    this.getMoney(function(err, current) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Set the money
        self.setMoney(current + amount, callback);
    }, {
        noCache: true
    });
};

/**
 * Called back on success or when an error occurred.
 *
 * @callback GameUserModel~addMoneyCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Subtract money from the user.
 *
 * @param {Number} amount Amount to subtract.
 * @param {GameUserModel~subtractMoneyCallback} callback Called back on success or when an error occurred.
 */
GameUserModel.prototype.subtractMoney = function(amount, callback) {
    this.addMoney(-amount, callback);
};

/**
 * Called back on success or when an error occurred.
 *
 * @callback GameUserModel~subtractMoneyCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Get the in goods the user has.
 *
 * @param {GameUserModel~getGoodsCallback} callback Called with result or when an error occurred.
 * @param {Object} options Model options.
 */
GameUserModel.prototype.getIn = function(callback, options) {
    this.getField('in', callback, options);
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback GameModel~getGoodsCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Number} Goods.
 */

/**
 * Set the in goods.
 *
 * @param {Number} amount Goods.
 * @param {GameUserModel~setFieldCallback} callback Called on success or when an error occurred.
 */
GameUserModel.prototype.setIn = function(amount, callback) {
    // Make sure the value isn't null, NaN or Infinite
    if(amount === null || isNaN(amount) || amount === Infinity || !_.isInteger(amount)) {
        callback(new Error('Invalid in amount: ' + amount));
        return;
    }

    // Set the field
    this.setField('in', amount, callback);
};

/**
 * Add in to the user.
 *
 * @param {Number} amount Amount to add.
 * @param {GameUserModel~addInCallback} callback Called back on success or when an error occurred.
 */
GameUserModel.prototype.addIn = function(amount, callback) {
    // Make sure the value isn't null, NaN or Infinite
    if(amount === null || isNaN(amount) || amount === Infinity || !_.isInteger(amount)) {
        callback(new Error('Invalid in amount: ' + amount));
        return;
    }

    // Show a warning if the amount to add is zero
    if(amount === 0) {
        // Print the warning
        console.warn('WARNING: Adding 0 to the in units for a user.');
        console.trace();

        // Call back
        callback(null);
        return;
    }

    // Store this instance
    const self = this;

    // Get the current in value
    this.getIn(function(err, current) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Set the in
        self.setIn(current + amount, callback);
    }, {
        noCache: true
    });
};

/**
 * Called back on success or when an error occurred.
 *
 * @callback GameUserModel~addInCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Subtract in from the user.
 *
 * @param {Number} amount Amount to subtract.
 * @param {GameUserModel~subtractInCallback} callback Called back on success or when an error occurred.
 */
GameUserModel.prototype.subtractIn = function(amount, callback) {
    this.addIn(-amount, callback);
};

/**
 * Called back on success or when an error occurred.
 *
 * @callback GameUserModel~subtractInCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Get the out goods the user has.
 *
 * @param {GameUserModel~getGoodsCallback} callback Called with result or when an error occurred.
 * @param {Object} options Model options.
 */
GameUserModel.prototype.getOut = function(callback, options) {
    this.getField('out', callback, options);
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback GameUserModel~getGoodsCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Number} Goods.
 */

/**
 * Set the out goods.
 *
 * @param {Number} amount Amount of out.
 * @param {GameUserModel~setFieldCallback} callback Called on success or when an error occurred.
 */
GameUserModel.prototype.setOut = function(amount, callback) {
    // Make sure the value isn't null, NaN or Infinite
    if(amount === null || isNaN(amount) || amount === Infinity || !_.isInteger(amount)) {
        callback(new Error('Invalid out amount: ' + amount));
        return;
    }

    // Set the field
    this.setField('out', amount, callback);
};

/**
 * Add out to the user.
 *
 * @param {Number} amount Amount to add.
 * @param {GameUserModel~addOutCallback} callback Called back on success or when an error occurred.
 */
GameUserModel.prototype.addOut = function(amount, callback) {
    // Make sure the value isn't null, NaN or Infinite
    if(amount === null || isNaN(amount) || amount === Infinity || !_.isInteger(amount)) {
        callback(new Error('Invalid out amount: ' + amount));
        return;
    }

    // Show a warning if the amount to add is zero
    if(amount === 0) {
        // Print the warning
        console.warn('WARNING: Adding 0 to the out units for a user.');
        console.trace();

        // Call back
        callback(null);
        return;
    }

    // Store this instance
    const self = this;

    // Get the current out value
    this.getOut(function(err, current) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Set the out
        self.setOut(current + amount, callback);
    }, {
        noCache: true
    });
};

/**
 * Called back on success or when an error occurred.
 *
 * @callback GameUserModel~addOutCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Subtract out from the user.
 *
 * @param {Number} amount Amount to subtract.
 * @param {GameUserModel~subtractOutCallback} callback Called back on success or when an error occurred.
 */
GameUserModel.prototype.subtractOut = function(amount, callback) {
    this.addOut(-amount, callback);
};

/**
 * Called back on success or when an error occurred.
 *
 * @callback GameUserModel~subtractOutCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Get the strength goods the user has.
 *
 * @param {GameUserModel~getGoodsCallback} callback Called with result or when an error occurred.
 * @param {Object} options Model options.
 */
GameUserModel.prototype.getStrength = function(callback, options) {
    this.getField('strength', callback, options);
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback GameModel~getGoodsCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Number} Goods.
 */

/**
 * Set the strength.
 *
 * @param {Number} amount Amount of strength.
 * @param {GameUserModel~setFieldCallback} callback Called on success or when an error occurred.
 */
GameUserModel.prototype.setStrength = function(amount, callback) {
    // Make sure the value isn't null, NaN or Infinite
    if(amount === null || isNaN(amount) || amount === Infinity || !_.isInteger(amount)) {
        callback(new Error('Invalid strength amount: ' + amount));
        return;
    }

    // Set the field
    this.setField('strength', amount, callback);
};

/**
 * Add strength to the user.
 *
 * @param {Number} amount Amount to add.
 * @param {GameUserModel~addStrengthCallback} callback Called back on success or when an error occurred.
 */
GameUserModel.prototype.addStrength = function(amount, callback) {
    // Make sure the value isn't null, NaN or Infinite
    if(amount === null || isNaN(amount) || amount === Infinity || !_.isNumber(amount)) {
        callback(new Error('Invalid strength amount: ' + amount));
        return;
    }

    // Show a warning if the amount to add is zero
    if(amount === 0) {
        // Print the warning
        console.warn('WARNING: Adding 0 to the strength value of a user.');
        console.trace();

        // Call back
        callback(null);
        return;
    }

    // Store this instance
    const self = this;

    // Get the current goods value
    this.getStrength(function(err, current) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Set the goods
        self.setStrength(current + amount, callback);
    }, {
        noCache: true
    });
};

/**
 * Called back on success or when an error occurred.
 *
 * @callback GameUserModel~addStrengthCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Subtract strength from the user.
 *
 * @param {Number} amount Amount to subtract.
 * @param {GameUserModel~subtractStrengthCallback} callback Called back on success or when an error occurred.
 */
GameUserModel.prototype.subtractStrength = function(amount, callback) {
    this.addStrength(-amount, callback);
};

/**
 * Called back on success or when an error occurred.
 *
 * @callback GameUserModel~subtractStrengthCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Check whether the given user is ally with the
 * @param {GameUserModel} otherUser The other user to check against.
 * @param {GameUserModel~isAllyWithCallback} callback Called with the result or when an error occurred.
 */
GameUserModel.prototype.isAllyWith = function(otherUser, callback) {
    // Make sure the other is valid
    if(otherUser === undefined || otherUser === null) {
        callback(new Error('Other user is undefined or null'), false);
        return;
    }

    // Get the user's and the other user's team
    var userTeam;
    var otherTeam;

    // Create a callback latch
    var latch = new CallbackLatch();
    var calledBack = false;

    // Get the users team
    latch.add();
    this.getTeam(function(err, team) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Call back if the team is null
        if(team === null) {
            if(!calledBack)
                callback(null, false);
            calledBack = true;
        }

        // Set the user team
        userTeam = team;

        // Resolve the latch
        latch.resolve();
    });

    // Get the users team
    latch.add();
    otherUser.getTeam(function(err, team) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Call back if the team is null
        if(team === null) {
            if(!calledBack)
                callback(null, false);
            calledBack = true;
        }

        // Set the user team
        otherTeam = team;

        // Resolve the latch
        latch.resolve();
    });

    // Compare the teams when done and call back
    latch.then(function() {
        callback(null, userTeam.getId().equals(otherTeam.getId()));
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback GameUserModel~isAllyWithCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 * @param {boolean} True if ally, false if not.
 */

/**
 * Get the live user instance for this game user.
 *
 * @param {function} callback callback(err, liveUser) The game user might be null if it's currently not loaded.
 */
GameUserModel.prototype.getLiveUser = function(callback) {
    // Store this instance
    const self = this;

    // Get the game
    this.getGame(function(err, game) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Get the live game this factory is in
        Core.gameManager.getGame(game, function(err, liveGame) {
            // Call back errors
            if(err !== null) {
                callback(err);
                return;
            }

            // Get the user
            self.getUser(function(err, user) {
                // Call back errors
                if(err !== null) {
                    callback(err);
                    return;
                }

                // Get the live user
                liveGame.userManager.getUser(user, function(err, liveUser) {
                    // Call back errors
                    if(err !== null) {
                        callback(err);
                        return;
                    }

                    // Call back the live user
                    callback(null, liveUser);
                });
            });
        })
    });
};

// Export the user class
module.exports = GameUserModel;
