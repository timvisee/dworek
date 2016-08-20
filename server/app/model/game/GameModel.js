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
var BaseModel = require('../../db/BaseModel');
var DatabaseObjectLayer = require('../../database/DatabaseObjectLayer');
var UserModel = require('../user/UserModel');
var ConversionFunctions = require('../../db/ConversionFunctions');

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
 * Get the user that created this game.
 *
 * @param {GameTeamModel~getUserCallback} callback Called with the user or when an error occurred.
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
 * @param {GameTeamModel~setFieldCallback} callback Called on success or when an error occurred.
 */
GameModel.prototype.setUser = function(user, callback) {
    this.setField('user', user, callback);
};

/**
 * Get the name of the game.
 *
 * @param {GameTeamModel~getNameCallback} callback Called with the name or when an error occurred.
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
 * @param {GameTeamModel~getStageCallback} callback Called with the game stage or when an error occurred.
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
 * @param {boolean|undefined} [options.queued=] True if the user must be queued, false if the player must not be queued.
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

// Export the user class
module.exports = GameModel;
