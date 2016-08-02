/******************************************************************************
 * Copyright (c) HHS OnTime 2016. All rights reserved.                        *
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

const crypto = require('crypto');

/**
 * Regular expression to match a token. The length is not taken into account.
 * @type {RegExp}
 */
const TOKEN_REGEX = /^[0-9a-f]*$/gi;

// The actual module with it's methods
module.exports = {
    /**
     * Regular expression to match a token. The length is not taken into account.
     * @type {RegExp}
     */
    TOKEN_REGEX: TOKEN_REGEX,

    /**
     * Generate a safe token with the given length.
     *
     * @param {int} length Length of the token.
     * @param {function} callback (err, {string} token) Called when a connection has been made, or when failed to connect.
     */
    generateToken: function(length, callback) {
        // Generate some random bytes
        crypto.randomBytes(length / 2, function(err, bytes) {
            // Convert the bytes into hexadecimal
            var token = bytes.toString('hex').toLowerCase();

            // Send the token through the callback
            callback(err, token);
        });
    }
};
