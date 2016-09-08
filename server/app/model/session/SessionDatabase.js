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

var config = require('../../../config');

var Core = require('../../../Core');
var MongoUtil = require('../../mongo/MongoUtils');

/**
 * Constructor.
 *
 * @returns {SessionDatabase} SessionDatabase instance.
 */
var SessionDatabase = function() {};

/**
 * Database collection name.
 */
SessionDatabase.DB_COLLECTION_NAME = 'session';

/**
 * Add a session to the database.
 *
 * @param {UserModel} user The user this session is created for.
 * @param {string} token Token.
 * @param {string|null} ip IP of the client that created this session.
 * @param {function} callback (err, {ObjectId} sessionId) Callback.
 */
SessionDatabase.addSession = function(user, token, ip, callback) {
    // Get the database instance
    var db = MongoUtil.getConnection();

    // Use a default IP address if it's undefined
    if(ip === undefined)
        ip = '0.0.0.0';

    // Determine the current, and expire date
    var createDate = new Date();
    var expireDate = new Date(new Date(createDate).setSeconds(createDate.getSeconds() + config.session.expire));

    // Create the insert object
    var insertObject = {
        user_id: user.getId(),
        token,
        create_date: createDate,
        create_ip: ip.toString(),
        last_use_date: null,
        expire_date: expireDate
    };

    // Insert the session into the database
    db.collection(SessionDatabase.DB_COLLECTION_NAME).insertOne(insertObject, function(err) {
        // Handle errors
        if(err != null) {
            // Show a warning and call back with the error
            console.warn('Failed insert new session into the database.');
            callback(err, null);
            return;
        }

        // Flush the model manager
        Core.model.sessionModelManager.flushCache(function(err) {
            // Call back errors
            if(err !== null) {
                callback(err);
                return;
            }

            // Call back with the inserted ID
            callback(null, insertObject._id);
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
// TODO: Use proper field names! (query and projection)
SessionDatabase.layerFetchFieldsFromDatabase = function(a, b, callback) {
    // Get the database instance
    var db = MongoUtil.getConnection();

    // Return some user data
    db.collection(SessionDatabase.DB_COLLECTION_NAME).find(a, b).toArray(callback);
};

// Export the session database module
module.exports = SessionDatabase;
