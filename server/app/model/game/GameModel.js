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
var GameDatabase = require('./GameDatabase');
var DatabaseObjectLayer = require('../../database/DatabaseObjectLayer');
var User = require('../user/UserModel');
var ObjectId = require('mongodb').ObjectId;

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

    // Apply the database object layer to this object
    this.layerApply(this, GameDatabase.DB_COLLECTION_NAME, {
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
        name: {
            field: 'name'
        },
        create_date: {
            field: 'create_date',
            toRedis: DatabaseObjectLayer.LAYER_PARSER_DATE_TO_REDIS,
            fromRedis: DatabaseObjectLayer.LAYER_PARSER_DATE_FROM_REDIS
        }
    });
};

// Inherit the database object layer
util.inherits(GameModel, DatabaseObjectLayer);

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
 * Get the user that created this game.
 *
 * @param {function} callback ({User} user) Callback with the result.
 */
GameModel.prototype.getUser = function(callback) {
    this.layerFetchField('user', callback);
};

/**
 * Get the name of the game.
 *
 * @param {function} callback (err, {string} name) Callback with the result.
 */
GameModel.prototype.getName = function(callback) {
    this.layerFetchField('name', callback);
};

/**
 * Get the date this game was created on.
 *
 * @param {function} callback (err, {Date} createDate) Callback with the result.
 */
GameModel.prototype.getCreateDate = function(callback) {
    this.layerFetchField('create_date', callback);
};

// Export the user class
module.exports = GameModel;
