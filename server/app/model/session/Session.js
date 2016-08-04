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
var ObjectCache = require('../../cache/ObjectCache');
var User = require('../user/User');
var ObjectId = require('mongodb').ObjectId;
var DatabaseObjectLayer = require('../../database/DatabaseObjectLayer');

/**
 * Constructor.
 *
 * @param {ObjectId} id Session ID object.
 *
 * @returns {Session} Session instance.
 */
var Session = function(id) {
    /**
     * Set the API application ID.
     *
     * @private
     */
    this._id = id;

    // Apply the database object layer to this object
    this.layerApply(this, SessionDatabase.DB_COLLECTION_NAME, {
        user: {
            field: 'user_id',
            toOutput: function(userId) {
                return new User(userId);
            },
            fromDb: function(userId) {
                return userId;
            },
            toRedis: function(userId) {
                return userId.toString();
            },
            fromRedis: function(userIdHex) {
                return new ObjectId(userIdHex);
            }
        },
        token: {
            field: 'token'
        },
        create_date: {
            field: 'create_date',
            toRedis: DatabaseObjectLayer.LAYER_PARSER_DATE_TO_REDIS,
            fromRedis: DatabaseObjectLayer.LAYER_PARSER_DATE_FROM_REDIS
        },
        create_ip: {
            field: 'create_ip'
        },
        last_use_date: {
            field: 'last_use_date',
            toRedis: DatabaseObjectLayer.LAYER_PARSER_DATE_TO_REDIS,
            fromRedis: DatabaseObjectLayer.LAYER_PARSER_DATE_FROM_REDIS
        },
        expire_date: {
            field: 'expire_date',
            toRedis: DatabaseObjectLayer.LAYER_PARSER_DATE_TO_REDIS,
            fromRedis: DatabaseObjectLayer.LAYER_PARSER_DATE_FROM_REDIS
        }
    });
};

// Inherit the database object layer
util.inherits(Session, DatabaseObjectLayer);

/**
 * Get the ID object of the session.
 *
 * @returns {ObjectId} Session ID object.
 */
Session.prototype.getId = function() {
    return this._id;
};

/**
 * Get the hexadecimal ID representation of the session.
 *
 * @returns {*} Session ID as hexadecimal string.
 */
Session.prototype.getIdHex = function() {
    return this.getId().toString();
};

/**
 * Get the user that owns this session.
 *
 * @param {function} callback ({User} user) Callback with the result.
 */
Session.prototype.getUser = function(callback) {
    this.layerFetchField('user', callback);
};

/**
 * Get the token of the session.
 *
 * @param {function} callback ({string} token) Callback with the result.
 */
Session.prototype.getToken = function(callback) {
    this.layerFetchField('token', callback);
};

/**
 * Get the create date of the session.
 *
 * @param {function} callback ({Date} createDate) Callback with the result.
 */
Session.prototype.getCreateDate = function(callback) {
    this.layerFetchField('create_date', callback);
};

/**
 * Get the IP address this session was created on.
 *
 * @param {function} callback ({string} createIp) Callback with the result.
 */
Session.prototype.getCreateIp = function(callback) {
    this.layerFetchField('create_ip', callback);
};

/**
 * Get the date this session was last used on.
 *
 * @param {function} callback ({Date} lastUseDate) Callback with the result.
 */
Session.prototype.getLastUseDate = function(callback) {
    // TODO: Make sure this uses the last-usage cache
    this.layerFetchField('last_use_date', callback);
};

/**
 * Get the expiration date of the session.
 *
 * @param {function} callback ({Date} expireDate) Callback with the result.
 */
Session.prototype.getExpireDate = function(callback) {
    this.layerFetchField('expire_date', callback);
};

/**
 * Delete the session.
 * This will also remove all cached instances of this session.
 *
 * @param {function} callback (err) Callback.
 */
// TODO: Create this function.
Session.prototype.delete = function(callback) {
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
module.exports = Session;
