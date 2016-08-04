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
var User = require('../user/User');
var ObjectId = require('mongodb').ObjectId;

// TODO: Fully rename this file from user to game.

/**
 * Constructor.
 *
 * @param {ObjectId} id Game ID object.
 *
 * @returns {Game} Game instance.
 */
var Game = function(id) {
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
util.inherits(Game, DatabaseObjectLayer);

/**
 * Get the ID object of the user.
 *
 * @returns {ObjectId} Game ID object.
 */
Game.prototype.getId = function() {
    return this._id;
};

/**
 * Get the hexadecimal ID representation of the user.
 *
 * @returns {*} Game ID as hexadecimal string.
 */
Game.prototype.getIdHex = function() {
    return this.getId().toString();
};

/**
 * Get the username of the user.
 *
 * @param {function} callback (err, {string} username) Callback with the result.
 */
Game.prototype.getUsername = function(callback) {
    this.layerFetchField('username', callback);
};

/**
 * Get the password hash of the user.
 *
 * @param {function} callback (err, {string} passwordHash) Callback with the result.
 */
Game.prototype.getPasswordHash = function(callback) {
    this.layerFetchField('password_hash', callback);
};

/**
 * Get the full name of the user.
 *
 * @param {function} callback (err, {string} fullName) Callback with the result.
 */
Game.prototype.getFullName = function(callback) {
    this.layerFetchField('full_name', callback);
};

/**
 * Get the nickname of the user.
 *
 * @param {function} callback (err, {string} nickname) Callback with the result.
 */
Game.prototype.getNickname = function(callback) {
    this.layerFetchField('nickname', callback);
};

/**
 * Get the date this user was created on.
 *
 * @param {function} callback (err, {Date} createDate) Callback with the result.
 */
Game.prototype.getCreateDate = function(callback) {
    this.layerFetchField('create_date', callback);
};

// Export the user class
module.exports = Game;
