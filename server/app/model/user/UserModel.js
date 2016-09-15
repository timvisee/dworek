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
var UserDatabase = require('./UserDatabase');
var BaseModel = require('../../database/BaseModel');
var ConversionFunctions = require('../../database/ConversionFunctions');
var CallbackLatch = require('../../util/CallbackLatch');

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
            mail: {},
            password_hash: {
                cache: {
                    enabled: false
                },
                redis: {
                    enabled: false
                }
            },
            first_name: {},
            last_name: {},
            nickname: {},
            create_date: {
                redis: {
                    from: ConversionFunctions.dateFromRedis,
                    to: ConversionFunctions.dateToRedis
                }
            },
            is_admin: {
                redis: {
                    from: (isAdmin) => isAdmin != '0',
                    to: (isAdmin) => isAdmin ? '1' : '0'
                }
            },
            is_pro: {
                redis: {
                    from: (isPro) => isPro != '0',
                    to: (isPro) => isPro ? '1' : '0'
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
 * Set the given fields to the given values.
 *
 * @param {Object} fields Object with key value pairs.
 * @param {UserModel~setFieldsCallback} callback Called on success, or when an error occurred.
 */
UserModel.prototype.setFields = function(fields, callback) {
    this._baseModel.setFields(fields, callback);
};

/**
 * Called on success, or when an error occurred.
 *
 * @callback UserModel~setFieldsCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Get the mail address for a user.
 *
 * @param {UserModel~getMailCallback} callback Called with mail address or when an error occurred.
 */
UserModel.prototype.getMail = function(callback) {
    this.getField('mail', callback);
};

/**
 * Called with the mail address or when an error occurred.
 *
 * @callback UserModel~getMailCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {String} Mail address of the user.
 */

/**
 * Set the mail address of the user.
 *
 * @param {String} mail Mail address.
 * @param {UserModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
UserModel.prototype.setMail = function(mail, callback) {
    this.setField('mail', mail, callback);
};

/**
 * Get the password hash of the user.
 *
 * @param {UserModel~getPasswordHashCallback} callback Called with the password hash or when an error occurred.
 */
UserModel.prototype.getPasswordHash = function(callback) {
    this.getField('password_hash', callback);
};

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
UserModel.prototype.setPasswordHash = function(passwordHash, callback) {
    this.setField('password_hash', passwordHash, callback);
};

/**
 * Get the first name of the user.
 *
 * @param {UserModel~getFirstNameCallback} callback Called with the first name of the user or when an error occurred.
 */
UserModel.prototype.getFirstName = function(callback) {
    this.getField('first_name', callback);
};

/**
 * Called with the first name of the user or when an error occurred.
 *
 * @callback UserModel~getFirstNameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {String} First name of the user.
 */

/**
 * Set the first name of the user.
 *
 * @param {String} firstName First name.
 * @param {UserModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
UserModel.prototype.setFirstName = function(firstName, callback) {
    this.setField('first_name', firstName, callback);
};

/**
 * Get the last name of the user.
 *
 * @param {UserModel~getLastNameCallback} callback Called with the last name of the user or when an error occurred.
 */
UserModel.prototype.getLastName = function(callback) {
    this.getField('last_name', callback);
};

/**
 * Called with the last name of the user or when an error occurred.
 *
 * @callback UserModel~getLastNameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {String} Last name of the user.
 */

/**
 * Set the last name of the user.
 *
 * @param {String} lastName Last name.
 * @param {UserModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
UserModel.prototype.setLastName = function(lastName, callback) {
    this.setField('last_name', lastName, callback);
};

/**
 * Get the nickname of the user.
 *
 * @param {UserModel~getNicknameCallback} callback Called with the nickname of the user or when an error occurred.
 */
UserModel.prototype.getNickname = function(callback) {
    this.getField('nickname', callback);
};

/**
 * Called with the nickname of the user or when an error occurred.
 *
 * @callback UserModel~getNicknameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {String} Nickname of the user.
 */

/**
 * Check whether the user has a custom nickname.
 *
 * @param {UserModel~hasNicknameCallback} callback Called with the result or when an error occurred.
 */
UserModel.prototype.hasNickname = function(callback) {
    this.getNickname(function(err, nickname) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Determine the result, and call back
        callback(null, nickname.trim().length > 0)
    });
};

/**
 * Called with the nickname of the user or when an error occurred.
 *
 * @callback UserModel~hasNicknameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean=} True if the user has a nickname, false if not.
 */

/**
 * Set the nickname of the user.
 *
 * @param {String} nickname Nickname.
 * @param {UserModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
UserModel.prototype.setNickname = function(nickname, callback) {
    this.setField('nickname', nickname, callback);
};

/**
 * Reset the nickname of the user.
 * This will remove the nickname of the user if any is set.
 *
 * @param {UserModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
UserModel.prototype.resetNickname = function(callback) {
    this.setNickname('', callback);
};

/**
 * Get the date this user was created on.
 *
 * @param {UserModel~getCreateDateCallback} callback Called with the date the user was created on or when an error occurred.
 */
UserModel.prototype.getCreateDate = function(callback) {
    this.getField('create_date', callback);
};

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
UserModel.prototype.setCreateDate = function(createDate, callback) {
    this.setField('create_date', createDate, callback);
};

/**
 * Check whether this user is administrator.
 *
 * @param {UserModel~isAdminCallback} callback Called with the result or when an error occurred.
 */
UserModel.prototype.isAdmin = function(callback) {
    this.getField('is_admin', callback);
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback UserModel~isAdminCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean} True if the user is administrator, false if not.
 */

/**
 * Set whether the user is administrator.
 *
 * @param {boolean} isAdmin True if the user is administrator, false if not.
 * @param {UserModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
UserModel.prototype.setCreateDate = function(isAdmin, callback) {
    this.setField('is?admin', isAdmin, callback);
};

/**
 * Check whether this user is pro.
 *
 * @param {UserModel~isProCallback} callback Called with the result or when an error occurred.
 */
UserModel.prototype.isPro = function(callback) {
    this.getField('is_pro', callback);
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback UserModel~isProCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean} True if the user is pro, false if not.
 */

/**
 * Set whether the user is pro.
 *
 * @param {boolean} isPro True if the user is pro, false if not.
 * @param {UserModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
UserModel.prototype.setCreateDate = function(isPro, callback) {
    this.setField('is?pro', isPro, callback);
};

/**
 * Get the game state for the given game.
 *
 * @param {GameModel} game Game.
 * @param {GameModelManager~getGameStateCallback} callback Called with the result or when an error occurred.
 */
UserModel.prototype.getGameState = function(game, callback) {
    Core.model.gameUserModelManager.getUserGameState(game, this, callback);
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
 * @callback GameModelManager~getGameStateCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {UserGameState=} User's game state.
 */

/**
 * Get the display name of the user.
 *
 * @param {UserModel~getDisplayNameCallback} callback Called with the display name or when an error occurred.
 */
UserModel.prototype.getDisplayName = function(callback) {
    // Create a callback latch
    var latch = new CallbackLatch();

    // Create a variable for the first name, last name and nickname
    var firstName, lastName, nickname;

    // Make sure we only call back once
    var calledBack = false;

    // Get the first name
    latch.add();
    this.getFirstName(function(err, result) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the first name
        firstName = result;

        // Resolve the latch
        latch.resolve();
    });

    // Get the last name
    latch.add();
    this.getLastName(function(err, result) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the last name
        lastName = result;

        // Resolve the latch
        latch.resolve();
    });

    // Get the nickname
    latch.add();
    this.getNickname(function(err, result) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the nickname
        nickname = result;

        // Resolve the latch
        latch.resolve();
    });

    // Call back the name
    latch.then(function() {
        // Combine the name
        var name = firstName + ' ' + lastName;
        if(nickname.trim().length > 0)
            name = firstName + ' \'' + nickname + '\' ' + lastName;

        // Call back the name
        callback(null, name);
    });
};

/**
 * Called with the display name or when an error occurred.
 *
 * @callback UserModel~getDisplayNameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {string=} Display name.
 */

// Export the user class
module.exports = UserModel;
