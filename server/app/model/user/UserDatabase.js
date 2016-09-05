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

var Core = require('../../../Core');
var MongoUtil = require('../../mongo/MongoUtils');
var HashUtils = require('../../hash/HashUtils');
var CallbackLatch = require('../../util/CallbackLatch');
var Validator = require('../../validator/Validator');

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
 * @param {String} mail Mail address.
 * @param {String} password Password.
 * @param {String} firstName First name.
 * @param {String} lastName Last name.
 * @param {function} callback (err, {UserModel} userId) Callback.
 */
UserDatabase.addUser = function(mail, password, firstName, lastName, callback) {
    // Get the database instance
    var db = MongoUtil.getConnection();

    // Validate the mail address
    if(!Validator.isValidMail(mail)) {
        // Call back with an error
        callback(new Error('Unable to create user, invalid mail address given.'));
        return;
    }

    // Validate the password
    if(!Validator.isValidPassword(password)) {
        // Call back with an error
        callback(new Error('Unable to create user, invalid password given.'));
        return;
    }

    // Validate the first and last name
    if(!Validator.isValidFirstName(firstName) || !Validator.isValidLastName(lastName)) {
        // Call back with an error
        callback(new Error('Unable to create user, invalid name given.'));
        return;
    }

    // TODO: Make sure a user with this mail address doesn't already exist (prevent circular dependency)

    // Format everything
    mail = Validator.formatMail(mail);
    firstName = Validator.formatFirstName(firstName);
    lastName = Validator.formatLastName(lastName);

    // Create a callback latch
    var latch = new CallbackLatch();

    // Hash the password
    latch.add();
    HashUtils.hash(password, function(err, hash) {
        // Call back errors
        if(err !== null && err !== undefined) {
            callback(new Error(err));
            return;
        }

        // Set the password
        password = hash;

        // Resolve the latch
        latch.resolve();
    });

    // Determine the current, and expire date
    var createDate = new Date();

    // Add the user to the database when we're ready
    latch.then(function() {
        // Create the object to insert
        var insertObject = {
            mail,
            password_hash: password,
            first_name: firstName,
            last_name: lastName,
            nickname: '',
            create_date: createDate
        };

        // Insert the session into the database
        db.collection(UserDatabase.DB_COLLECTION_NAME).insertOne(insertObject, function(err, result) {
            // Handle errors and make sure the status is ok
            if(err !== null) {
                // Show a warning and call back with the error
                console.warn('Unable to create new user, failed to insert user into database.');
                callback(err, null);
                return;
            }

            // Flush the model manager
            Core.model.userModelManager.flushCache(function(err) {
                // Call back errors
                if(err !== null) {
                    callback(err);
                    return;
                }

                // Call back with the inserted ID
                callback(null, Core.model.userModelManager._instanceManager.create(insertObject._id));
            });
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
