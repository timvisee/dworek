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

var util = require('util');

var Core = require('../../../Core');
var GameDatabase = require('./GameDatabase');
var BaseModel = require('../../database/BaseModel');
var ConversionFunctions = require('../../database/ConversionFunctions');
var UserModel = require('../user/UserModel');
var CallbackLatch = require('../../util/CallbackLatch');

/**
 * GameModel class.
 *
 * @class
 * @constructor
 *
 * @param {ObjectId} id Game ID object.
 *
 * @returns {GameTeamModel} Game instance.
 */
var GameModel = function(id) {
    /**
     * Set the API application ID.
     *
     * @private
     */
    this._id = id;

    // Create and configure the base model instance for this model
    this._baseModel = new BaseModel(this, {
        mongo: {
            collection: GameDatabase.DB_COLLECTION_NAME
        },
        fields: {
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
            name: {},
            stage: {
                redis: {
                    /**
                     * Convert the stage number from a string to an integer.
                     *
                     * @param {string} stage Stage string.
                     * @return {Number} Stage number.
                     */
                    from: (stage) => parseInt(stage, 10),

                    /**
                     * Convert the stage number to a string.
                     *
                     * @param {Number} stage Stage number.
                     *
                     * @return {string} Stage number as a string.
                     */
                    to: (stage) => stage.toString()
                }
            },
            create_date: {
                redis: {
                    from: ConversionFunctions.dateFromRedis,
                    to: ConversionFunctions.dateToRedis
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
GameModel.prototype.getId = function() {
    return this._id;
};

/**
 * Get the hexadecimal ID representation of the game.
 *
 * @returns {*} Game ID as hexadecimal string.
 */
GameModel.prototype.getIdHex = function() {
    return this.getId().toString();
};

/**
 * Get the given field from the model.
 *
 * @param {String} field Field names.
 * @param {GameTeamModel~getFieldCallback} callback Called with the result of a model field, or when an error occurred.
 */
GameModel.prototype.getField = function(field, callback) {
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
GameModel.prototype.setField = function(field, value, callback) {
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
 * @param {GameModel~setFieldsCallback} callback Called on success, or when an error occurred.
 */
GameModel.prototype.setFields = function(fields, callback) {
    this._baseModel.setFields(fields, callback);
};

/**
 * Called on success, or when an error occurred.
 *
 * @callback GameModel~setFieldsCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Get the user that created this game.
 *
 * @param {GameModel~getUserCallback} callback Called with the user or when an error occurred.
 */
GameModel.prototype.getUser = function(callback) {
    this.getField('user', callback);
};

/**
 * Called with the user or when an error occurred.
 *
 * @callback GameModel~getUserCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {UserModel} User.
 */

/**
 * Set the user that created this game.
 *
 * @param {UserModel} user User.
 * @param {GameModel~setFieldCallback} callback Called on success or when an error occurred.
 */
GameModel.prototype.setUser = function(user, callback) {
    this.setField('user', user, callback);
};

/**
 * Get the name of the game.
 *
 * @param {GameModel~getNameCallback} callback Called with the name or when an error occurred.
 */
GameModel.prototype.getName = function(callback) {
    this.getField('name', callback);
};

/**
 * Called with the name or when an error occurred.
 *
 * @callback GameModel~getNameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {String} Game name.
 */

/**
 * Set the name of the game.
 *
 * @param {String} name Game name.
 * @param {GameTeamModel~setFieldCallback} callback Called on success or when an error occurred.
 */
GameModel.prototype.setName = function(name, callback) {
    this.setField('name', name, callback);
};

/**
 * Get the stage of the game.
 *
 * @param {GameModel~getStageCallback} callback Called with the game stage or when an error occurred.
 */
GameModel.prototype.getStage = function(callback) {
    this.getField('stage', callback);
};

/**
 * Called with the game stage or when an error occurred.
 *
 * @callback GameModel~getStageCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Number} Game stage.
 */

/**
 * Set the stage of the game.
 *
 * @param {Number} stage Game stage.
 * @param {GameTeamModel~setFieldCallback} callback Called on success or when an error occurred.
 */
GameModel.prototype.setStage = function(stage, callback) {
    this.setField('stage', stage, callback);
};

/**
 * Get the date this game was created on.
 *
 * @param {GameTeamModel~getCreateDateCallback} callback Called with the creation date or when an error occurred.
 */
GameModel.prototype.getCreateDate = function(callback) {
    this.getField('create_date', callback);
};

/**
 * Called with the creation date or when an error occurred.
 *
 * @callback GameModel~getCreateDateCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Date} Game creation date.
 */

/**
 * Set the date this game was created on.
 *
 * @param {Date} createDate Game creation date.
 * @param {GameTeamModel~setFieldCallback} callback Called on success or when an error occurred.
 */
GameModel.prototype.setCreateDate = function(createDate, callback) {
    this.setField('create_date', createDate, callback);
};

/**
 * Get the number of users that joined this game.
 *
 * @param {GameModelManager~getGameUserCountCallback} callback Called with the result or when an error occurred.
 */
GameModel.prototype.getUsersCount = function(callback) {
    Core.model.gameUserModelManager.getGameUsersCount(this, callback);
};

/**
 * @typedef {Object} GameUsersState
 * @property {Number} total Total number of users that joined this game.
 * @property {Number} totalAccepted Total number of users that were accepted for this game.
 * @property {Number} players Total number of users that joined a team.
 * @property {Number} specials Total number of users that are a special player.
 * @property {Number} spectators Total number of users that are a spectator.
 * @property {Number} requested Total number of users that requested to join the game.
 */

/**
 * Called with the number of users in the game.
 *
 * @callback GameModelManager~getGameUserCountCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {GameUsersState=} Number of users in the game.
 */

/**
 * Check whether the given user joined this game.
 *
 * @param {UserModel} user The user to check for.
 * @param {Object} [options] Options object for additional configurations and constraints.
 * @param {boolean|undefined} [options.players=] True if the user must be in a team, false if the user may not be in a
 * team. Undefined to ignore this constraint.
 * @param {boolean|undefined} [options.spectators=] True if the user must be a spectator, false if the user may not be
 * a spectator. Undefined to ignore this constraint.
 * @param {boolean|undefined} [options.specials=] True if the user must be a special player, false if the user may not
 * be a special player. Undefined to ignore this constraint.
 * @param {boolean|undefined} [options.requested=] True if the user must be requested, false if the player must not be requested.
 * This option overrides other constraints when set to true. Undefined to ignore this constraint.
 * @param {GameModelManager~hasUserCallback} callback Called with the result or when an error occurred.
 */
GameModel.prototype.hasUser = function(user, options, callback) {
    Core.model.gameUserModelManager.hasUser(this, user, options, callback);
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback GameModelManager~hasUserCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean=} True if the given user joined this game.
 */

/**
 * Check whether the given user is a player in the game.
 *
 * @param {UserModel} user The user to check for.
 * @param {GameModelManager~isPlayerCallback} callback Called with the result or when an error occurred.
 */
GameModel.prototype.isPlayer = function(user, callback) {
    Core.model.gameUserModelManager.hasUser(this, user, {
        players: true
    }, callback);
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback GameModelManager~isPlayerCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean=} True if the given user is a player in the game, false if not.
 */

/**
 * Get the user state for the given user.
 *
 * @param {UserModel} user User.
 * @param {GameModelManager~getUserStateCallback} callback Called with the result or when an error occurred.
 */
GameModel.prototype.getUserState = function(user, callback) {
    Core.model.gameUserModelManager.getUserGameState(this, user, callback);
};

/**
 * @typedef {Object} UserGameState
 * @property {boolean} player True if the user is a player in a team, false if not.
 * @property {boolean} special True if the user is a special player in the game, false if not.
 * @property {boolean} spectator True if the user is a spectator, false if not.
 * @property {boolean} requested True if the user requested to join this game, false if not.
 */

/**
 * Called with the user's game state or when an error occurred.
 *
 * @callback GameModelManager~getUserStateCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {UserGameState=} User's game state.
 */


/**
 * Get the teams for this game.
 *
 * @param {GameModel~getTeamsCallback} callback Called back with the list of teams or when an error occurred.
 */
GameModel.prototype.getTeams = function(callback) {
    Core.model.gameTeamModelManager.getGameTeams(this, callback);
};

/**
 * Called back with the list of teams or when an error occurred.
 *
 * @callback GameModel~getTeamsCallback
 * @param {Error|null} Error instance if an error occurred, null if not.
 * @param {Array} Array of team model instances.
 */

/**
 * Get the number of teams for this game.
 *
 * @param {GameModel~getTeamCountCallback} callback Called back with the number of teams or when an error occurred.
 */
GameModel.prototype.getTeamCount = function(callback) {
    Core.model.gameTeamModelManager.getGameTeamCount(this, callback);
};

/**
 * Called back with the number of teams or when an error occurred.
 *
 * @callback GameModel~getTeamCountCallback
 * @param {Error|null} Error instance if an error occurred, null if not.
 * @param {Number} Number of teams in this game.
 */

/**
 * Check whether the given user has permission to manage this game.
 * A user will have permission if it's the host of the game, or if the user is administrator.
 *
 * @param {UserModel|ObjectId|string} user User to check.
 * @param {GameModel~hasManagePermissionCallback} callback Called with the result or when an error occurred.
 */
GameModel.prototype.hasManagePermission = function(user, callback) {
    // Create a callback latch
    var latch = new CallbackLatch();

    // Keep track whether we called back or not
    var calledBack = false;

    // Check whether the user is administrator
    latch.add();
    user.isAdmin(function(err, isAdmin) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Call back true if the user is administrator
        if(isAdmin) {
            calledBack = true;
            callback(null, true);
            return;
        }

        // Resolve the latch
        latch.resolve();
    });

    // Check whether the user is host of this game
    latch.add();
    this.getUser(function(err, host) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Make sure a valid user was fetched, resolve the latch if not
        if(host == undefined) {
            latch.resolve();
            return;
        }

        // Call back true if the user is host of the game
        if(host.getId().equals(user.getId())) {
            calledBack = true;
            callback(null, true);
            return;
        }

        // Resolve the latch
        latch.resolve();
    });

    // Call back false if we reach the callback latch
    latch.then(() => callback(null, false));
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback GameModel~hasManagePermissionCallback
 * @param {Error|null} Error instance if an error occurred.
 * @param {boolean} True if the user has permission to manage the game, false if not.
 */

// Export the user class
module.exports = GameModel;
