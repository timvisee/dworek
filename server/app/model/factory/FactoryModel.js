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

var Core = require('../../../Core');
var FactoryDatabase = require('./FactoryDatabase');
var BaseModel = require('../../database/BaseModel');
var ConversionFunctions = require('../../database/ConversionFunctions');
var Coordinate = require('../../coordinate/Coordinate');
var CallbackLatch = require('../../util/CallbackLatch');

/**
 * FactoryModel class.
 *
 * @class
 * @constructor
 *
 * @param {ObjectId} id Factory ID object.
 */
var FactoryModel = function(id) {
    /**
     * Set the API application ID.
     *
     * @private
     */
    this._id = id;

    // Create and configure the base model instance for this model
    this._baseModel = new BaseModel(this, {
        mongo: {
            collection: FactoryDatabase.DB_COLLECTION_NAME
        },
        fields: {
            name: {},
            create_date: {
                redis: {
                    from: ConversionFunctions.dateFromRedis,
                    to: ConversionFunctions.dateToRedis
                }
            },
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
                     * Convert a hexadecimal ID to a game model.
                     *
                     * @param {String} id
                     * @return {GameModel} Game.
                     */
                    from: (id) => Core.model.gameModelManager._instanceManager.create(id),

                    /**
                     * Convert an game model to a hexadecimal ID.
                     *
                     * @param {GameModel} game Game.
                     * @return {String} Hexadecimal ID.
                     */
                    to: (game) => game.getIdHex()
                }
            },
            team: {
                mongo: {
                    field: 'team_id',

                    /**
                     * Convert an ID to a game team model.
                     *
                     * @param {ObjectId} id
                     * @return {GameTeamModel} Team.
                     */
                    from: (id) => Core.model.gameTeamModelManager._instanceManager.create(id),

                    /**
                     * Convert an game team model to an ID.
                     *
                     * @param {GameTeamModel} gameTeam Game team.
                     * @return {ObjectId} ID.
                     */
                    to: (gameTeam) => gameTeam.getId()
                },
                redis: {
                    /**
                     * Convert a hexadecimal ID to a game team model.
                     *
                     * @param {String} id
                     * @return {GameTeamModel} Game team.
                     */
                    from: (id) => Core.model.gameTeamModelManager._instanceManager.create(id),

                    /**
                     * Convert an game team model to a hexadecimal ID.
                     *
                     * @param {GameTeamModel} gameTeam Game team.
                     * @return {String} Hexadecimal ID.
                     */
                    to: (gameTeam) => gameTeam.getIdHex()
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
            location: {
                mongo: {
                    from: (raw) => Coordinate.parse(raw)
                },
                redis: {
                    /**
                     * Convert a serialized location to a location object.
                     *
                     * @param {string} raw Serialized location.
                     * @param {Coordinate|null} Deserialized location.
                     */
                    from: (raw) => Coordinate.deserialize(raw),

                    /**
                     * Serialize the location to store it in Redis.
                     *
                     * @param {Coordinate} location Location to serialize.
                     * @return {string} Serialized location.
                     */
                    to: (location) => location.serialize()
                }
            },
            level: {
                redis: {
                    /**
                     * Convert the string back to a numeric value.
                     *
                     * @param {string} raw String value.
                     * @return {Number} Numeric value.
                     */
                    from: (raw) => parseInt(raw),

                    /**
                     * Convert the numeric value to a string.
                     *
                     * @param {Number} value Numeric value.
                     * @return {string} String value.
                     */
                    to: (value) => value.toString()
                }
            },
            defence: {
                redis: {
                    /**
                     * Convert the string back to a numeric value.
                     *
                     * @param {string} raw String value.
                     * @return {Number} Numeric value.
                     */
                    from: (raw) => parseInt(raw),

                    /**
                     * Convert the numeric value to a string.
                     *
                     * @param {Number} value Numeric value.
                     * @return {string} String value.
                     */
                    to: (value) => value.toString()
                }
            },
            in: {
                redis: {
                    /**
                     * Convert the string back to a numeric value.
                     *
                     * @param {string} raw String value.
                     * @return {Number} Numeric value.
                     */
                    from: (raw) => parseInt(raw),

                    /**
                     * Convert the numeric value to a string.
                     *
                     * @param {Number} value Numeric value.
                     * @return {string} String value.
                     */
                    to: (value) => value.toString()
                }
            },
            out: {
                redis: {
                    /**
                     * Convert the string back to a numeric value.
                     *
                     * @param {string} raw String value.
                     * @return {Number} Numeric value.
                     */
                    from: (raw) => parseInt(raw),

                    /**
                     * Convert the numeric value to a string.
                     *
                     * @param {Number} value Numeric value.
                     * @return {string} String value.
                     */
                    to: (value) => value.toString()
                }
            }
        }
    });
};

/**
 * Get the ID object of the factory.
 *
 * @returns {ObjectId} Factory ID object.
 */
FactoryModel.prototype.getId = function() {
    return this._id;
};

/**
 * Get the hexadecimal ID representation of the factory.
 *
 * @returns {*} Factory ID as hexadecimal string.
 */
FactoryModel.prototype.getIdHex = function() {
    return this.getId().toString();
};

/**
 * Get the given field from the model.
 *
 * @param {String} field Field names.
 * @param {FactoryModel~getFieldCallback} callback Called with the result of a model field, or when an error occurred.
 * @param {Object} options Model options.
 */
FactoryModel.prototype.getField = function(field, callback, options) {
    this._baseModel.getField(field, callback, options);
};

/**
 * Called with the result of a model field, or when an error occurred.
 *
 * @callback FactoryModel~getFieldCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {*=} Field value.
 */

/**
 * Set the given field to the given value for this model.
 *
 * @param {String} field Field name.
 * @param {*} value Field value.
 * @param {FactoryModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
FactoryModel.prototype.setField = function(field, value, callback) {
    this._baseModel.setField(field, value, callback);
};

/**
 * Called on success, or when an error occurred.
 *
 * @callback FactoryModel~setFieldCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Set the given fields to the given values.
 *
 * @param {Object} fields Object with key value pairs.
 * @param {FactoryModel~setFieldsCallback} callback Called on success, or when an error occurred.
 */
FactoryModel.prototype.setFields = function(fields, callback) {
    this._baseModel.setFields(fields, callback);
};

/**
 * Called on success, or when an error occurred.
 *
 * @callback FactoryModel~setFieldsCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Get the name for the factory.
 *
 * @param {FactoryModel~getNameCallback} callback Called with name or when an error occurred.
 */
FactoryModel.prototype.getName = function(callback) {
    this.getField('name', callback);
};

/**
 * Called with the name or when an error occurred.
 *
 * @callback FactoryModel~getNameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {String} Name of the factory.
 */

/**
 * Set the name of the factory.
 *
 * @param {String} name Factory name.
 * @param {FactoryModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
FactoryModel.prototype.setName = function(name, callback) {
    this.setField('name', name, callback);
};

/**
 * Get the creation date for the factory.
 *
 * @param {FactoryModel~getCreateDateCallback} callback Called with creation date or when an error occurred.
 */
FactoryModel.prototype.getCreateDate = function(callback) {
    this.getField('create_date', callback);
};

/**
 * Called with the creation date or when an error occurred.
 *
 * @callback FactoryModel~getCreateDateCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Date} Creation date of the factory.
 */

/**
 * Set the creation date of the factory.
 *
 * @param {Date} date Creation date.
 * @param {FactoryModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
FactoryModel.prototype.setCreateDate = function(date, callback) {
    this.setField('create_date', date, callback);
};

/**
 * Get the game for the factory.
 *
 * @param {FactoryModel~getGameCallback} callback Called with game or when an error occurred.
 */
FactoryModel.prototype.getGame = function(callback) {
    this.getField('game', callback);
};

/**
 * Called with the game or when an error occurred.
 *
 * @callback FactoryModel~getGameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {GameModel} Game of the factory.
 */

/**
 * Set the game of the factory.
 *
 * @param {GameModel} game Game.
 * @param {FactoryModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
FactoryModel.prototype.setGame = function(game, callback) {
    this.setField('game', game, callback);
};

/**
 * Get the game team for the factory.
 *
 * @param {FactoryModel~getTeamCallback} callback Called with game team or when an error occurred.
 */
FactoryModel.prototype.getTeam = function(callback) {
    this.getField('team', callback);
};

/**
 * Called with the game team or when an error occurred.
 *
 * @callback FactoryModel~getTeamCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {GameTeamModel} Game team of the factory.
 */

/**
 * Set the game team of the factory.
 *
 * @param {GameTeamModel} gameTeam Game team.
 * @param {FactoryModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
FactoryModel.prototype.setTeam = function(gameTeam, callback) {
    this.setField('team', gameTeam, callback);
};

/**
 * Get the user for the factory.
 *
 * @param {FactoryModel~getUserCallback} callback Called with user or when an error occurred.
 */
FactoryModel.prototype.getUser = function(callback) {
    this.getField('user', callback);
};

/**
 * Called with the user or when an error occurred.
 *
 * @callback FactoryModel~getUserCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {UserModel} User of the factory.
 */

/**
 * Set the user of the factory.
 *
 * @param {UserModel} user User.
 * @param {FactoryModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
FactoryModel.prototype.setUser = function(user, callback) {
    this.setField('user', user, callback);
};

/**
 * Get the location of the factory.
 *
 * @param {FactoryModel~getLocationCallback} callback Called with location or when an error occurred.
 */
FactoryModel.prototype.getLocation = function(callback) {
    this.getField('location', callback);
};

/**
 * Called with the location or when an error occurred.
 *
 * @callback FactoryModel~getLocationCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Coordinate} Location of the factory.
 */

/**
 * Set the location of the factory.
 *
 * @param {Coordinate} location Location.
 * @param {FactoryModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
FactoryModel.prototype.setLocation = function(location, callback) {
    this.setField('location', location, callback);
};

/**
 * Get the level of the factory.
 *
 * @param {FactoryModel~getLevelCallback} callback Called with level or when an error occurred.
 * @param {Object} options Model options.
 */
FactoryModel.prototype.getLevel = function(callback, options) {
    this.getField('level', callback, options);
};

/**
 * Called with the level or when an error occurred.
 *
 * @callback FactoryModel~getLevelCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Number} Level of the factory.
 */

/**
 * Set the level of the factory.
 *
 * @param {Number} level Factory level.
 * @param {FactoryModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
FactoryModel.prototype.setLevel = function(level, callback) {
    // Make sure the value isn't null, NaN or Infinite
    if(level === null || isNaN(level) || level === Infinity || !_.isInteger(level)) {
        callback(new Error('Invalid level value: ' + level));
        return;
    }

    // Set the field
    this.setField('level', level, callback);
};

/**
 * Get the defence value of the factory.
 *
 * @param {FactoryModel~getDefenceCallback} callback Called with defence value or when an error occurred.
 * @param {Object} options Model options.
 */
FactoryModel.prototype.getDefence = function(callback, options) {
    this.getField('defence', callback, options);
};

/**
 * Called with the defence value or when an error occurred.
 *
 * @callback FactoryModel~getDefenceCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Number} Defence value of the factory.
 */

/**
 * Set the defence value of the factory.
 *
 * @param {Number} defence Defence value.
 * @param {FactoryModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
FactoryModel.prototype.setDefence = function(defence, callback) {
    // Make sure the value isn't null, NaN or Infinite
    if(defence === null || isNaN(defence) || defence === Infinity || !_.isInteger(defence)) {
        callback(new Error('Invalid defence value: ' + defence));
        return;
    }

    // Set the field
    this.setField('defence', defence, callback);
};

/**
 * Get the in of the factory.
 *
 * @param {FactoryModel~getInCallback} callback Called with in or when an error occurred.
 * @param {Object} options Model options.
 */
FactoryModel.prototype.getIn = function(callback, options) {
    this.getField('in', callback, options);
};

/**
 * Called with the in or when an error occurred.
 *
 * @callback FactoryModel~getInCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Number} Factory in.
 */

/**
 * Set the in of the factory.
 *
 * @param {Number} value In value.
 * @param {FactoryModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
FactoryModel.prototype.setIn = function(value, callback) {
    // Make sure the value isn't null, NaN or Infinite
    if(value === null || isNaN(value) || value === Infinity || !_.isInteger(value)) {
        callback(new Error('Invalid in value: ' + value));
        return;
    }

    // Set the field
    this.setField('in', value, callback);
};

/**
 * Add in to the factory.
 *
 * @param {Number} amount Amount to add.
 * @param {FactoryModel~addInCallback} callback Called back on success or when an error occurred.
 */
FactoryModel.prototype.addIn = function(amount, callback) {
    // Make sure the value isn't null, NaN or Infinite
    if(amount === null || isNaN(amount) || amount === Infinity || !_.isInteger(amount)) {
        callback(new Error('Invalid in amount: ' + amount));
        return;
    }

    // Show a warning if the amount to add is zero
    if(amount === 0) {
        // Print the warning
        console.warn('WARNING: Adding 0 to in units in a factory.');
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
 * Subtract in from the factory.
 *
 * @param {Number} amount Amount to subtract.
 * @param {FactoryModel~subtractInCallback} callback Called back on success or when an error occurred.
 */
FactoryModel.prototype.subtractIn = function(amount, callback) {
    this.addIn(-amount, callback);
};

/**
 * Called back on success or when an error occurred.
 *
 * @callback FactoryModel~subtractInCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Get the out of the factory.
 *
 * @param {FactoryModel~getOutCallback} callback Called with in or when an error occurred.
 * @param {Object} options Model options.
 */
FactoryModel.prototype.getOut = function(callback, options) {
    this.getField('out', callback, options);
};

/**
 * Called with the out or when an error occurred.
 *
 * @callback FactoryModel~getOutCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Number} Factory out.
 */

/**
 * Set the out of the factory.
 *
 * @param {Number} value Out value.
 * @param {FactoryModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
FactoryModel.prototype.setOut = function(value, callback) {
    // Make sure the value isn't null, NaN or Infinite
    if(value === null || isNaN(value) || value === Infinity || !_.isInteger(value)) {
        callback(new Error('Invalid out value: ' + value));
        return;
    }

    // Set the field
    this.setField('out', value, callback);
};

/**
 * Add out to the factory.
 *
 * @param {Number} amount Amount to add.
 * @param {FactoryModel~addOutCallback} callback Called back on success or when an error occurred.
 */
FactoryModel.prototype.addOut = function(amount, callback) {
    // Make sure the value isn't null, NaN or Infinite
    if(amount === null || isNaN(amount) || amount === Infinity || !_.isInteger(amount)) {
        callback(new Error('Invalid out amount: ' + amount));
        return;
    }

    // Show a warning if the amount to add is zero
    if(amount === 0) {
        // Print the warning
        console.warn('WARNING: Adding 0 to out units in a factory.');
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
 * @callback FactoryModel~addOutCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Subtract out from the factory.
 *
 * @param {Number} amount Amount to subtract.
 * @param {FactoryModel~subtractOutCallback} callback Called back on success or when an error occurred.
 */
FactoryModel.prototype.subtractOut = function(amount, callback) {
    this.addOut(-amount, callback);
};

/**
 * Called back on success or when an error occurred.
 *
 * @callback FactoryModel~subtractOutCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Spread the contents of this factory, the in and the out units, over all players in the owning team.
 *
 * @param {boolean} clearFactory True to set the contents of the factory to zero, false to skip this step.
 * @param {FactoryModel~spreadContentsCallback} callback Called back on success, or when an error occurred.
 */
FactoryModel.prototype.spreadContents = function(clearFactory, callback) {
    // Create a latch for the process
    const latch = new CallbackLatch();
    var calledBack = false;

    // Keep a reference to this
    const self = this;

    // Get the current factory contents, and the users to give it to
    var contentsIn = 0;
    var contentsOut = 0;

    // Get the in contents
    latch.add();
    self.getIn(function (err, amount) {
        // Call back errors
        if (err !== null) {
            if (!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the amount
        contentsIn = amount;

        // Resolve the latch
        latch.resolve();
    }, {
        noCache: true
    });

    // Get the out contents
    latch.add();
    self.getOut(function(err, amount) {
        // Call back errors
        if (err !== null) {
            if (!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the amount
        contentsOut = amount;

        // Resolve the latch
        latch.resolve();
    }, {
        noCache: true
    });

    // Continue when the current contents have been fetched
    latch.then(function() {
        // Reset the latch to it's identity
        latch.identity();

        // Check whether to clear the factory
        if(clearFactory) {
            // Reset the factory in contents
            latch.add();
            self.setIn(0, function(err) {
                // Call back errors
                if (err !== null) {
                    if (!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Resolve the latch
                latch.resolve();
            });

            // Reset the factory out contents
            latch.add();
            self.setOut(0, function(err) {
                // Call back errors
                if (err !== null) {
                    if (!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Resolve the latch
                latch.resolve();
            });
        }

        // Continue when the contents have been set
        latch.then(function() {
            // Get the team that owns this factory
            self.getTeam(function(err, team) {
                // Call back errors
                if (err !== null) {
                    if (!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Get the users in this team
                team.getGameUsers(function(err, gameUsers) {
                    // Call back errors
                    if (err !== null) {
                        if (!calledBack)
                            callback(err);
                        calledBack = true;
                        return;
                    }

                    // Count the users
                    const userCount = gameUsers.length;

                    // Create a contents spread latch
                    var spreadLatch = new CallbackLatch();

                    // Spread the goods over all team players
                    if(userCount > 0) {
                        // Determine how much to give everyone
                        const partIn = Math.ceil(contentsIn / userCount);
                        const partOut = Math.ceil(contentsOut / userCount);

                        // Loop through the users and give the units
                        gameUsers.forEach(function(gameUser) {
                            // Determine how much to give
                            const giveIn = Math.min(partIn, contentsIn);
                            const giveOut = Math.min(partOut, contentsOut);

                            // Return if both are zero
                            if (giveIn <= 0 && giveOut <= 0)
                                return;

                            // Subtract the values
                            contentsIn -= giveIn;
                            contentsOut -= giveOut;

                            // Add the units to the user
                            if(giveIn > 0) {
                                spreadLatch.add();
                                gameUser.addIn(giveIn, function (err) {
                                    // Call back errors
                                    if (err !== null) {
                                        if (!calledBack)
                                            callback(err);
                                        calledBack = true;
                                        return;
                                    }

                                    // Resolve the latch
                                    spreadLatch.resolve();
                                });
                            }

                            // Add the units to the user
                            if(giveOut > 0) {
                                spreadLatch.add();
                                gameUser.addOut(giveOut, function (err) {
                                    // Call back errors
                                    if (err !== null) {
                                        if (!calledBack)
                                            callback(err);
                                        calledBack = true;
                                        return;
                                    }

                                    // Resolve the latch
                                    spreadLatch.resolve();
                                });
                            }
                        });
                    }

                    // Resolve the content latch when the transfers are done
                    spreadLatch.then(function () {
                        // We're done, call back
                        callback(null);
                    });
                });
            });
        });
    });
};

/**
 * Called back on success or when an error occurred.
 *
 * @callback FactoryModel~spreadContentsCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Get the live factory instance for this factory.
 *
 * @param {function} callback callback(err, liveFactory) The factory might be null if it's currently not loaded.
 */
FactoryModel.prototype.getLiveFactory = function(callback) {
    // Store this instance
    const self = this;

    // Get the factory game
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

            // Get the live factory
            liveGame.factoryManager.getFactory(self, function(err, liveFactory) {
                // Call back errors
                if(err !== null) {
                    callback(err);
                    return;
                }

                // Call back the live factory
                callback(null, liveFactory);
            });
        })
    });
};

/**
 * Delete the factory.
 *
 * @param {FactoryModel~deleteCallback} [callback] Called on success, or when an error occurred.
 */
FactoryModel.prototype.delete = function(callback) {
    // Delete the session model
    this._baseModel.flush(undefined, function(err) {
        // Call back errors
        if(err !== null) {
            if(callback !== undefined)
                callback(err);
            return;
        }

        // Flush the model manager
        Core.model.factoryModelManager.flushCache(function(err) {
            if(callback !== undefined)
                callback(err);
        });
    });
};

/**
 * Called on success, or when an error occurred.
 *
 * @callback FactoryModel~deleteCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

// Export the factory class
module.exports = FactoryModel;
