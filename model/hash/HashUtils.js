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

var config = require('../../config');
var bcrypt = require('bcrypt');

// The actual module with it's methods
module.exports = {

    /**
     * Hash the given secret.
     *
     * @param {string} secret Secret to hash as a string.
     * @param {string|undefined} salt Global salt to use for this hash, use {@code undefined} to ignore the global salt.
     * @param {HashUtils~hashCallback} callback Callback function with the hash result.
     */
    hash: function(secret, salt, callback) {
        // Concatenate the secret and salt, if a salt is configured
        if(salt !== undefined && salt !== null && salt.length > 0)
            secret = secret + salt;

        // Determine the number of times to hash
        let hashRounds = config.security.hashRounds;

        // Hash the secret
        bcrypt.hash(secret, hashRounds, callback);
    },

    /**
     * Hash callback, called when a secret has been hashed.
     * This callback contains the hash as a string, unless an error occurred.
     *
     * @callback HashUtils~hashCallback
     * @param {Error|null} An error instance if an error occurred, null otherwise.
     * @param {string} Hash as a string.
     */

    /**
     * Compare a secret to a hash.
     *
     * @param {string} secret The secret to compare the hash to as a string.
     * @param {string|undefined} salt Global salt that was used for the hash, use {@code undefined} to ignore this property.
     * @param {string} hash The hash to compare the secret to as a string.
     * @param {HashUtils~compareCallback} callback Callback function with the comparison result.
     */
    compare: function(secret, salt, hash, callback) {
        // Concatenate the secret and salt, if a salt is configured
        if(salt !== undefined && salt !== null && salt.length > 0)
            secret = secret + salt;

        // Compare the hash and secret
        bcrypt.compare(secret, hash, callback);
    }

    /**
     * Hash comparison callback, called when a hash has been compared to a secret.
     * This callback contains the result of the comparison, unless an error occurred.
     *
     * @callback HashUtils~compareCallback
     * @param {Error|null} An error instance if an error occurred, null otherwise.
     * @param {boolean} True if the comparison was successful and the hash matched the secret, false otherwise.
     */
};
