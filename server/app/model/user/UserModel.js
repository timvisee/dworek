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
var UserDatabase = require('./UserDatabase');
var BaseModel = require('../../db/BaseModel');
var DatabaseObjectLayer = require('../../database/DatabaseObjectLayer');
var ConversionFunctions = require('../../db/ConversionFunctions');

/**
 * UserModel class.
 *
 * @class
 * @constructor
 *
 * @param {ObjectId} id User ID object.
 */
var UserModel = function(id) {
    /**
     * Set the API application ID.
     *
     * @private
     */
    this._id = id;

    // Create and configure the base model instance for this model
    this._baseModel = new BaseModel(this, {
        mongo: {
            collection: UserDatabase.DB_COLLECTION_NAME
        },
        fields: {
            username: {},
            password_hash: {
                cache: {
                    enabled: false
                },
                redis: {
                    enabled: false
                }
            },
            full_name: {},
            nickname: {},
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
 * Get the ID object of the user.
 *
 * @returns {ObjectId} User ID object.
 */
UserModel.prototype.getId = function() {
    return this._id;
};

/**
 * Get the hexadecimal ID representation of the user.
 *
 * @returns {*} User ID as hexadecimal string.
 */
UserModel.prototype.getIdHex = function() {
    return this.getId().toString();
};

/**
 * Get the given field from the model.
 *
 * @param {String} field Field names.
 * @param {UserModel~getFieldCallback} callback Called with the result of a model field, or when an error occurred.
 */
UserModel.prototype.getField = function(field, callback) {
    this._baseModel.getField(field, callback);
};

/**
 * Called with the result of a model field, or when an error occurred.
 *
 * @callback UserModel~getFieldCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {*=} Field value.
 */

/**
 * Set the given field to the given value for this model.
 *
 * @param {String} field Field name.
 * @param {*} value Field value.
 * @param {UserModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
UserModel.prototype.setField = function(field, value, callback) {
    this._baseModel.setField(field, value, callback);
};

/**
 * Called on success, or when an error occurred.
 *
 * @callback UserModel~setFieldCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Get the username of the user.
 *
 * @param {UserModel~getUsernameCallback} callback Called with the username or when an error occurred.
 */
UserModel.prototype.getUsername = (callback) => this.getField('username', callback);

/**
 * Called with the username or when an error occurred.
 *
 * @callback UserModel~getUsernameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {String} Username of the user.
 */

/**
 * Set the username of the user.
 *
 * @param {String} username Username.
 * @param {UserModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
UserModel.prototype.setUsername = (username, callback) => this.setField('username', username, callback);

/**
 * Get the password hash of the user.
 *
 * @param {UserModel~getPasswordHashCallback} callback Called with the password hash or when an error occurred.
 */
UserModel.prototype.getPasswordHash = (callback) => this.getField('password_hash', callback);

/**
 * Called with the password hash or when an error occurred.
 *
 * @callback UserModel~getPasswordHashCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {String} Password hash of the user.
 */

/**
 * Set the password hash of the user.
 *
 * @param {String} passwordHash Password hash.
 * @param {UserModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
UserModel.prototype.setPasswordHash = (passwordHash, callback) => this.setField('password_hash', passwordHash, callback);

/**
 * Get the full name of the user.
 *
 * @param {UserModel~getFullNameCallback} callback Called with the full name of the user or when an error occurred.
 */
UserModel.prototype.getFullName = (callback) => this.getField('full_name', callback);

/**
 * Called with the full name of the user or when an error occurred.
 *
 * @callback UserModel~getFullNameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {String} Full name of the user.
 */

/**
 * Set the full name of the user.
 *
 * @param {String} fullName Full name.
 * @param {UserModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
UserModel.prototype.setFullName = (fullName, callback) => this.setField('full_name', fullName, callback);

/**
 * Get the nickname of the user.
 *
 * @param {UserModel~getNicknameCallback} callback Called with the nickname of the user or when an error occurred.
 */
UserModel.prototype.getNickname = (callback) => this.getField('nickname', callback);

/**
 * Called with the nickname of the user or when an error occurred.
 *
 * @callback UserModel~getNicknameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {String} Nickname of the user.
 */

/**
 * Set the nickname of the user.
 *
 * @param {String} nickname Nickname.
 * @param {UserModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
UserModel.prototype.setNickname = (nickname, callback) => this.setField('nickname', nickname, callback);

/**
 * Get the date this user was created on.
 *
 * @param {UserModel~getCreateDateCallback} callback Called with the date the user was created on or when an error occurred.
 */
UserModel.prototype.getCreateDate = (callback) => this.getField('create_date', callback);

/**
 * Called with the date the user was created on or when an error occurred.
 *
 * @callback UserModel~getCreateDateCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Date} Creation date.
 */

/**
 * Set the date this user was created on.
 *
 * @param {Date} createDate Creation date.
 * @param {UserModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
UserModel.prototype.setCreateDate = (createDate, callback) => this.setField('create_date', createDate, callback);

// Export the user class
module.exports = UserModel;
