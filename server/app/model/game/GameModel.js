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
var ObjectId = require('mongodb').ObjectId;
var GameDatabase = require('./GameDatabase');
var BaseModel = require('../../db/BaseModel');
var DatabaseObjectLayer = require('../../database/DatabaseObjectLayer');
var UserModel = require('../user/UserModel');
var ConversionFunctions = require('../../db/ConversionFunctions');

/**
 * Constructor.
 *
 * @param {ObjectId} id Game ID object.
 *
 * @returns {GameModel} Game instance.
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
                    // TODO: Get the user from the user manager instead of instantiating it directly
                    from: (id) => new UserModel(id),

                    /**
                     * Convert an User model to an ID.
                     *
                     * @param {UserModel} user User.
                     * @return {ObjectId} ID.
                     */
                    to: (user) => user.getId()
                },
                cache: {
                    /**
                     * Convert a hexadecimal ID to a User model.
                     *
                     * @param {String} id
                     * @return {UserModel} User.
                     */
                    // TODO: Get the user from the user manager instead of instantiating it directly
                    from: (id) => new UserModel(new ObjectId(id)),

                    /**
                     * Convert an User model to a hexadecimal ID.
                     *
                     * @param {UserModel} user User.
                     * @return {String} Hexadecimal ID.
                     */
                    to: (user) => user.getIdHex()
                },
                redis: {
                    /**
                     * Convert a hexadecimal ID to a User model.
                     *
                     * @param {String} id
                     * @return {UserModel} User.
                     */
                    // TODO: Get the user from the user manager instead of instantiating it directly
                    from: (id) => new UserModel(new ObjectId(id)),

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
 * @param {GameModel~getFieldCallback} callback Called with the result of a model field, or when an error occurred.
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
 * @param {GameModel~setFieldCallback} callback Called on success, or when an error occurred.
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
 * @param {GameModel~getUserCallback} callback Called with the user or when an error occurred.
 */
GameModel.prototype.getUser = (callback) => this.getField('user', callback);

/**
 * Called with the user or when an error occurred.
 *
 * @callback GameModel~getUserCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {User} User.
 */

/**
 * Get the name of the game.
 *
 * @param {GameModel~getNameCallback} callback Called with the name or when an error occurred.
 */
GameModel.prototype.getName = (callback) => this.getField('name', callback);

/**
 * Called with the name or when an error occurred.
 *
 * @callback GameModel~getNameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {String} Game name.
 */

/**
 * Get the date this game was created on.
 *
 * @param {GameModel~getCreateDateCallback} callback Called with the creation date or when an error occurred.
 */
GameModel.prototype.getCreateDate = (callback) => this.getField('create_date', callback);

/**
 * Called with the creation date or when an error occurred.
 *
 * @callback GameModel~getCreateDateCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Date} Game creation date.
 */

// Export the user class
module.exports = GameModel;
