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

/**
 * Client class.
 *
 * @param socket SocketIO socket instance.
 * @param {UserModel} [user] User instance if known.
 *
 * @class
 * @constructor
 */
var Client = function(socket, user) {
    // Parse the user
    if(user == undefined)
        user = null;

    /**
     * Client socket.
     * @private
     */
    this._socket = socket;

    /**
     * Client user.
     * @type {UserModel}
     * @private
     */
    this._user = user;
};

/**
 * Get the client user if set.
 *
 * @return {UserModel|null} User model or null if the user is unknown.
 */
Client.prototype.getUser = function() {
    return this._user;
};

/**
 * Check whether this client has a specific user.
 *
 * @return {boolean} True if this client has a specific user, false if not.
 */
Client.prototype.hasUser = function() {
    return this.getUser() != null;
};

/**
 * Set the user of this client.
 *
 * @param {UserModel|null} user User of the client or null if the user is unknown.
 */
Client.prototype.setUser = function(user) {
    this._user = user;
};

// Export the module
module.exports = Client;
