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
var SessionDatabase = require('./SessionDatabase');
var BaseModel = require('../../db/BaseModel');
var DatabaseObjectLayer = require('../../database/DatabaseObjectLayer');

/**
 * Constructor.
 *
 * @param {ObjectId} id Session ID object.
 *
 * @returns {SessionModel} Session instance.
 */
var SessionModel = function(id) {
    /**
     * Set the API application ID.
     *
     * @private
     */
    this._id = id;

    // Create and configure the base model instance for this model
    this._baseModel = new BaseModel(this, {
        mongo: {
            collection: SessionDatabase.DB_COLLECTION_NAME
        },
        fields: {
            user: {
                mongo: {
                    field: 'user_id',
                    from: function(value) {
                        return value;
                    },
                    to: function(value) {
                        return value;
                    }
                },
                cache: {
                    enable: true,
                    from: function(value) {
                        return value;
                    },
                    to: function(value) {
                        return value;
                    }
                },
                redis: {
                    enable: true,
                    from: function(value) {
                        return value;
                    },
                    to: function(value) {
                        return value;
                    }
                }
            },
            token: {
                mongo: {
                    field: 'token'
                }
            },
            create_date: {
                mongo: {
                    field: 'create_date'
                },
                toRedis: DatabaseObjectLayer.LAYER_PARSER_DATE_TO_REDIS,
                fromRedis: DatabaseObjectLayer.LAYER_PARSER_DATE_FROM_REDIS
            },
            create_ip: {
                mongo: {
                    field: 'create_ip'
                }
            },
            last_use_date: {
                mongo: {
                    field: 'last_use_date'
                },
                toRedis: DatabaseObjectLayer.LAYER_PARSER_DATE_TO_REDIS,
                fromRedis: DatabaseObjectLayer.LAYER_PARSER_DATE_FROM_REDIS
            },
            expire_date: {
                mongo: {
                    field: 'expire_date'
                },
                toRedis: DatabaseObjectLayer.LAYER_PARSER_DATE_TO_REDIS,
                fromRedis: DatabaseObjectLayer.LAYER_PARSER_DATE_FROM_REDIS
            }
        }
    });
};

/**
 * Get the ID object of the session.
 *
 * @returns {ObjectId} Session ID object.
 */
SessionModel.prototype.getId = () => this._id;

/**
 * Get the hexadecimal ID representation of the session.
 *
 * @returns {*} Session ID as hexadecimal string.
 */
SessionModel.prototype.getIdHex = () => this.getId().toString();

/**
 * Get the given field from the model.
 *
 * @param {String} field Field names.
 * @param {SessionModel~getFieldCallback} callback Called with the result of a model field, or when an error occurred.
 */
SessionModel.prototype.getField = function(field, callback) {
    this._baseModel.getField(field, callback);
};

/**
 * Set the given field to the given value for this model.
 *
 * @param {String} field Field name.
 * @param {*} value Field value.
 * @param {SessionModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
SessionModel.prototype.setField = function(field, value, callback) {
    this._baseModel.setField(field, value, callback);
};

/**
 * Called on success, or when an error occurred.
 *
 * @callback SessionModel~setFieldCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

/**
 * Called with the result of a model field, or when an error occurred.
 *
 * @callback SessionModel~getFieldCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {*=} Field value.
 */

/**
 * Get the user that owns this session.
 *
 * @param {SessionModel~getUserCallback} callback Called with the user, or when an error occurred.
 */
SessionModel.prototype.getUser = (callback) => this.getField('user', callback);

/**
 * Called with the user, or when an error occurred.
 *
 * @callback SessionModel~getUserCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {User=} User.
 */

/**
 * Set the user that owns this session.
 *
 * @param {User} user User.
 * @param {SessionModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
SessionModel.prototype.setUser = (user, callback) => this.setField('user', user, callback);

/**
 * Get the token of the session.
 *
 * @param {SessionModel~getTokenCallback} callback Called with the token, or when an error occurred.
 */
SessionModel.prototype.getToken = (callback) => this.getField('token', callback);

/**
 * Called with the token, or when an error occurred.
 *
 * @callback SessionModel~getTokenCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {String=} Token.
 */

/**
 * Set the token for this session.
 *
 * @param {String} token Token.
 * @param {SessionModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
SessionModel.prototype.setToken = (token, callback) => this.setField('token', token, callback);

/**
 * Get the creation date of the session.
 *
 * @param {SessionModel~getCreateDateCallback} callback Called with the creation date, or when an error occurred.
 */
SessionModel.prototype.getCreateDate = (callback) => this.getField('create_date', callback);

/**
 * Called with the creation date, or when an error occurred.
 *
 * @callback SessionModel~getCreateDateCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Date=} Creation date.
 */

/**
 * Set the creation date for this session.
 *
 * @param {Date} createDate Creation date.
 * @param {SessionModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
SessionModel.prototype.setCreateDate = (createDate, callback) => this.setField('create_date', createDate, callback);

/**
 * Get the IP address this session was created on.
 *
 * @param {SessionModel~getCreateIpCallback} callback Called with the IP this session was created with, or when an error occurred.
 */
SessionModel.prototype.getCreateIp = (callback) => this.getField('create_ip', callback);

/**
 * Called with the IP this session was created with, or when an error occurred.
 *
 * @callback SessionModel~getCreateIpCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {String=} IP address this session was created with.
 */

/**
 * Set the IP this session was created with.
 *
 * @param {String} createIp IP address.
 * @param {SessionModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
SessionModel.prototype.setCreateIp = (createIp, callback) => this.setField('create_ip', createIp, callback);

/**
 * Get the date this session was last used on.
 *
 * @param {SessionModel~getLastUseDateCallback} callback Called with the date the session was last used on, or when an error occurred.
 */
SessionModel.prototype.getLastUseDate = (callback) => this.getField('last_use_date', callback);

/**
 * Called with the date the session was last used on, or when an error occurred.
 *
 * @callback SessionModel~getLastUseDateCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Date=} Date the session was last used on.
 */

/**
 * Set the date this session was last used on.
 *
 * @param {Date} date Date.
 * @param {SessionModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
SessionModel.prototype.setLastUseDate = (date, callback) => this.setField('last_use_date', date, callback);

/**
 * Get the expiration date of the session.
 *
 * @param {SessionModel~getExpireDateCallback} callback Called with the date the session expires on, or when an error occurred.
 */
SessionModel.prototype.getExpireDate = (callback) => this.getField('expire_date', callback);

/**
 * Called with the date the session expires on, or when an error occurred.
 *
 * @callback SessionModel~getExpireDateCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Date=} The session expiration date.
 */

/**
 * Set the expiration date of the session.
 *
 * @param {Date} expireDate Expiration date.
 * @param {SessionModel~setFieldCallback} callback Called on success, or when an error occurred.
 */
SessionModel.prototype.setExpireDate = (expireDate, callback) => this.setField('expire_date', expireDate, callback);



// TODO: Rework this!

/**
 * Delete the session.
 * This will also remove all cached instances of this session.
 *
 * @param {function} callback (err) Callback.
 */
// TODO: Create this function.
SessionModel.prototype.delete = function(callback) {
    // Delete the session from the database
    this.layerDeleteFromDatabase(function(err) {
        // Handle errors
        if(err != null) {
            callback(err);
            return;
        }

        // FIXME: Delete "api:session:TOKEN_HERE:sessionId" key
        // FIXME: Delete all cached entries for this Session (database object layer entries are already deleted)

        // Call back
        callback(null);
    });
};

// Return the created class
module.exports = SessionModel;
