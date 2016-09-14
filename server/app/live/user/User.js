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

var mongo = require('mongodb');
var ObjectId = mongo.ObjectId;

var Core = require('../../../Core');
var UserModel = require('../../model/user/UserModel');

/**
 * User class.
 *
 * @param {UserModel|ObjectId|string} user User model instance or the ID of a user.
 *
 * @class
 * @constructor
 */
var User = function(user) {
    /**
     * ID of the user this object corresponds to.
     * @type {ObjectId}
     */
    this._id = null;

    /**
     * User model instance if available.
     * @type {UserModel|null} User model instance or null if no instance is currently available.
     */
    this._model = null;

    // Get and set the user ID
    if(user instanceof UserModel)
        this._id = user.getId();
    else if(!(user instanceof ObjectId) && ObjectId.isValid(user))
        this._id = new ObjectId(user);
    else {
        throw new Error('Invalid user instance or ID');
        return;
    }

    // Store the user model instance if any was given
    if(user instanceof UserModel)
        this._model = user;
};

/**
 * Get the user ID for this user.
 *
 * @return {ObjectId} User ID.
 */
User.prototype.getId = function() {
    return this._id;
};

/**
 * Check whether the give user instance or ID equals this user.
 *
 * @param {UserModel|ObjectId|string} user User instance or the user ID.
 * @return {boolean} True if this user equals the given user instance.
 */
User.prototype.isUser = function(user) {
    // Get the user ID as an ObjectId
    if(user instanceof UserModel)
        user = user.getId();
    else if(!(user instanceof ObjectId) && ObjectId.isValid(user))
        user = new ObjectId(user);
    else {
        callback(new Error('Invalid user ID'));
        return;
    }

    // Compare the user ID
    return this._id.equals(user);
};

/**
 * Get the user model.
 *
 * @return {UserModel} User model instance.
 */
User.prototype.getUserModel = function() {
    // Return the model if it isn't null
    if(this._model !== null)
        return this._model;

    // Create a user model for the known ID, store and return it
    return this._model = Core.model.userModelManager._instanceManager.create(this._id);
};

/**
 * Get the user name.
 *
 * @param {User~getNameCallback} callback Callback with the result.
 */
User.prototype.getName = function(callback) {
    this.getUserModel().getName(callback);
};

/**
 * @callback User~getNameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {string} User name.
 */

// Export the class
module.exports = User;

