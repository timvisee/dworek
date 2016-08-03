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
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;

/**
 * MongoDB database connection instance.
 *
 * @type {MongoClient|null} MongoDB client, or null.
 */
var connection = null;

/**
 * MongoUtils class.
 *
 * @class
 * @constructor
 */
var MongoUtils = function() {};

/**
 * Connect to the Mongo DB database as configured in the configuration file.
 *
 * @param {MongoUtils~connectCallback} callback Called when a connection has been made, or when failed to connect.
 */
MongoUtils.connect = function(callback) {
    // Show a status message
    console.log('Connecting to the database...');

    // Connect to the database
    MongoClient.connect(config.db.url, function(err, db) {
        // Make sure the connection has been successfully established
        if(err != null) {
            console.error("Failed to establish a connection to the database!");
            console.error(err);
            return;
        }

        // A connection was made, show a status message
        console.log("Successfully established a connection to the database!");

        // Set the database instance
        connection = db;

        // Call the callback
        return callback(err, db);
    });
};

/**
 * Callback invoked when a connection has been made, or if we failed to connect.
 *
 * @callback MongoUtils~connectCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {MongoClient|null} MongoDB client instance if a connection has been made, null otherwise.
 */

/**
 * Get the MongoDB database connection instance. A connection must have been established, or null will be returned.
 *
 * @returns {MongoClient|null}
 */
MongoUtils.getConnection = function() {
    return connection;
};

// Export the class
module.exports = MongoUtils;