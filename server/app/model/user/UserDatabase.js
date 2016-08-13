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

var MongoUtil = require('../../mongo/MongoUtils');
var HashUtils = require('../../hash/HashUtils');
var CallbackLatch = require('../../util/CallbackLatch');

/**
 * Constructor.
 *
 * @returns {UserDatabase} UserDatabase instance.
 */
var UserDatabase = function() {};

/**
 * Database collection name.
 */
UserDatabase.DB_COLLECTION_NAME = 'user';

/**
 * Add an user to the database.
 *
 * @param {String} username Username.
 * @param {String} password Password.
 * @param {String} mail Mail address.
 * @param {String} firstName First name.
 * @param {String} lastName Last name.
 * @param {function} callback (err, {ObjectId} userId) Callback.
 */
// FIXME: username, password_hash, mail, nickname, full_name, create_date
UserDatabase.addUser = function(username, password, mail, firstName, lastName, callback) {
    // Get the database instance
    var db = MongoUtil.getConnection();

    // TODO: Validate input!

    // Create a callback latch
    var latch = new CallbackLatch();

    // Determine the current, and expire date
    var createDate = new Date();

    // Hash the password
    latch.add();
    HashUtils.hash(password, function(err, hash) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Set the password
        password = hash;

        // Resolve the latch
        latch.resolve();
    });

    // Add the user to the database when we're ready
    latch.then(function() {
        // Insert the session into the database
        db.collection(UserDatabase.DB_COLLECTION_NAME).insert({
            username,
            password_hash: password,
            mail,
            first_name: firstName,
            last_name: lastName,
            nickname: '',
            create_date: createDate

        }, function(err, data) {
            // Handle errors
            if(err != null) {
                // Show a warning and call back with the error
                console.warn('Failed insert new user into the database.');
                callback(err, null);
                return;
            }

            // Call back with the inserted ID
            callback(null, data._id);
        });
    });
};

/**
 * Do a find query on the API token database. Parse the result as an array through a callback.
 *
 * @param a First find parameter.
 * @param b Second find parameter.
 * @param {function} callback (err, data) Callback.
 */
UserDatabase.layerFetchFieldsFromDatabase = function(a, b, callback) {
    // Get the database instance
    var db = MongoUtil.getConnection();

    // Return some user data
    db.collection(UserDatabase.DB_COLLECTION_NAME).find(a, b).toArray(callback);
};

// Export the user database module
module.exports = UserDatabase;
