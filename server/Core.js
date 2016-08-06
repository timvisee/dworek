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

var async = require('async');
var express = require('express');

var GameController = require('./app/game/GameController');
var MongoUtils = require('./app/mongo/MongoUtils');
var RedisUtils = require('./app/redis/RedisUtils');
var Router = require('./app/router/Router');

/**
 * Core class.
 *
 * @class
 * @constructor
 */
var Core = function() {};

/**
 * Define whether the core is initialized.
 *
 * @private
 * @type {boolean}
 */
Core._init = false;

/**
 * Game controller instance.
 *
 * @type {GameController|null} Game controller instance, or null if the core hasn't been initialized.
 */
Core.gameController = null;

/**
 * Express app instance.
 *
 * @type {*} Express app.
 */
Core.expressApp = null;

/**
 * Initialize the Core.
 *
 * @param {function} initCallback Called when successfully initialized, or when an error occurred.
 */
Core.init = function(initCallback) {
    // Initialize various components in parallel
    async.parallel([
        function(callback) {
            // Initialize the game controller
            Core._initGameController(callback)
        },

        function(callback) {
            // Initialize the express application
            Core._initExpressApp(callback)
        },

        function(callback) {
            // Initialize the database
            Core._initDatabase(callback)
        },

        function(callback) {
            // Initialize Redis
            Core._initRedis(callback)
        }

    ], function(err) {
        // Make sure everything went right
        if(err !== null)
            initCallback(err);

        // Initialize the router
        //noinspection JSAccessibilityCheck
        Core._initRouter(function(err) {
            // Call back any errors, or throw it if no callback was defined
            if(err !== null) {
                if(initCallback !== undefined)
                    initCallback(err);
                else
                    throw err;
            }

            // Set the initialization status
            Core._init = true;

            // Call back
            if(initCallback !== undefined)
                initCallback(null);
        });
    });
};

/**
 * Check whether the core is initialized.
 *
 * @return {boolean} True if initialized, false if not.
 */
Core.isInit = function() {
    return Core._init;
};

/**
 * Initialize the game controller.
 */
Core._initGameController = function(callback) {
    // Initialize the game controller
    Core.gameController = new GameController();

    // Load all active games
    Core.gameController.loadActiveGames(function(err) {
        // We're done, call back if a callback is defined
        callback(err);
    });
};

/**
 * Initialize the express app.
 *
 * @param {function} [callback] Called when finished initializing, or when an error occurred.
 */
Core._initExpressApp = function(callback) {
    // Create an Express application instance
    Core.expressApp = express();

    // Disable express branding in HTTP responses
    Core.expressApp.disable('x-powered-by');

    // We're done, call back if a callback is defined
    if(callback !== undefined)
        callback(null);
};

/**
 * Initialize the router.
 *
 * @param {function} [callback] Called when the router has been initialized.
 */
Core._initRouter = function(callback) {
    // Initialize the router
    Router.init();

    // We're done, call back if a callback is defined
    if(callback !== undefined)
        callback(null);
};

/**
 * Initialize the database and connect.
 *
 * @param {function} [callback] Called when a connection has been made, or if an error occurred.
 */
Core._initDatabase = function(callback) {
    // Connect to the database
    MongoUtils.connect(function(err) {
        // Handle errors
        if(err != null)
            throw new Error('Failed to connect to MongoDB. Quitting server.');

        // TODO: Retry on connection failure

        // We're done, call back if a callback is defined
        if(callback !== undefined)
            callback(null);
    });
};

/**
 * Initialize Redis and connect.
 *
 * @param {function} [callback] Called when a connection has been made, or if an error occurred.
 */
Core._initRedis = function(callback) {
    // Connect to Redis
    RedisUtils.connect(function(err) {
        // We're done, call back if a callback is defined// We're done, call back if a callback is defined
        if(callback !== undefined)
            callback(err);
    });
};

// Export the class
module.exports = Core;