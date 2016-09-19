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
 * @returns {FactoryDatabase} FactoryDatabase instance.
 */
var FactoryDatabase = function() {};

/**
 * Database collection name.
 */
FactoryDatabase.DB_COLLECTION_NAME = 'factory';

/**
 * Add an factory to the database.
 *
 * @param {String} name Name of the factory.
 * @param {GameModel} game Game the factory is created for.
 * @param {UserModel} user User that created this factory.
 * @param {Coordinate} location Factory location.
 * @param {FactoryDatabase~addFactoryCallback} callback Called on success or on failure.
 */
FactoryDatabase.addFactory = function (name, game, team, user, location, callback) {
    // Get the database instance
    var db = MongoUtil.getConnection();

    // Validate the factory name
    if(!Validator.isValidFactoryName(name)) {
        // Call back with an error
        callback(new Error('Unable to create factory, invalid name given.'));
        return;
    }

    // Make sure the game and user are valid
    if(game == null || team == null || user == null) {
        callback(new Error('Unable to create factory, invalid game, team or user instance.'));
        return;
    }

    // Format the factory name
    name = Validator.formatFactoryName(name);

    // Create a callback latch
    var latch = new CallbackLatch();

    // Create a variable for the game configuration
    var gameConfig = null;

    // Get the configuration for this game
    latch.add();
    game.getConfig(function(err, result) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Set the game config
        gameConfig = result;

        // Resolve the latch
        latch.resolve();
    });

    // Add the factory to the database when we're ready
    latch.then(function() {
        // Create the object to insert
        var insertObject = {
            name,
            create_date: new Date(),
            user_id: user.getId(),
            team_id: team.getId(),
            game_id: game.getId(),
            location,
            level: gameConfig.factory.initialLevel,
            defence: gameConfig.factory.initialDefence,
            in: gameConfig.factory.initialIn,
            out: gameConfig.factory.initialOut
        };

        // Insert the session into the database
        db.collection(FactoryDatabase.DB_COLLECTION_NAME).insertOne(insertObject, function(err, result) {
            // Handle errors and make sure the status is ok
            if(err !== null) {
                // Show a warning and call back with the error
                console.warn('Unable to create new factory, failed to insert factory into database.');
                callback(err, null);
                return;
            }

            // Flush the model manager
            Core.model.factoryModelManager.flushCache(function(err) {
                // Call back errors
                if(err !== null) {
                    callback(err);
                    return;
                }

                // Call back with the inserted ID
                callback(null, Core.model.factoryModelManager._instanceManager.create(insertObject._id));
            });
        });
    });
};

/**
 * Called with the new factory or when an error occurred.
 *
 * @callback FactoryDatabase~addFactoryCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {FactoryModel=} Factory model that was added to the database.
 */

/**
 * Do a find query on the API token database. Parse the result as an array through a callback.
 *
 * @param a First find parameter.
 * @param b Second find parameter.
 * @param {function} callback (err, data) Callback.
 */
FactoryDatabase.layerFetchFieldsFromDatabase = function(a, b, callback) {
    // Get the database instance
    var db = MongoUtil.getConnection();

    // Return some factory data
    db.collection(FactoryDatabase.DB_COLLECTION_NAME).find(a, b).toArray(callback);
};

// Export the factory database module
module.exports = FactoryDatabase;
