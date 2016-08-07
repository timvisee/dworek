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
var PathLibrary = require('./PathLibrary');

/**
 * Core class.
 *
 * @class
 * @constructor
 */
var Core = function() {
    /**
     * Define whether the core is initialized.
     *
     * @private
     * @type {boolean}
     */
    this._init = false;

    /**
     * Router instance.
     *
     * @type {Router}
     */
    this.router = null;

    /**
     * Game controller instance.
     *
     * @type {GameController|null} Game controller instance, or null if the core hasn't been initialized.
     */
    this.gameController = null;

    /**
     * Express app instance.
     *
     * @type {*} Express app.
     */
    this.expressApp = null;

};

/**
 * Initialize the Core.
 *
 * @param {function} [initCallback] Called when successfully initialized, or when an error occurred.
 */
Core.prototype.init = function(initCallback) {
    // Store the instance
    const instance = this;

    // Initialize various components in parallel
    async.parallel([
        function(callback) {
            // Print the library paths, and call back
            PathLibrary.printPaths();
            callback(null);
        },

        // TODO: Can we rename this parameter, to make the init() parameter consistent?
        function(callback) {
            // Initialize the game controller
            instance._initGameController(callback)
        },

        // TODO: Can we rename this parameter, to make the init() parameter consistent?
        function(callback) {
            // Initialize the express application
            instance._initExpressApp(callback)
        },

        // TODO: Can we rename this parameter, to make the init() parameter consistent?
        function(callback) {
            // Initialize the database
            instance._initDatabase(callback)
        },

        // TODO: Can we rename this parameter, to make the init() parameter consistent?
        function(callback) {
            // Initialize Redis
            instance._initRedis(callback)
        }

    ], function(err) {
        // Make sure everything went right, callback or throw an error instead
        if(err !== null) {
            if(initCallback !== undefined)
                initCallback(err);
            else
                throw err;
            return;
        }

        // Initialize the router
        //noinspection JSAccessibilityCheck
        instance._initRouter(function(err) {
            // Call back any errors, or throw it if no callback was defined
            if(err !== null) {
                if(initCallback !== undefined)
                    initCallback(err);
                else
                    throw err;
            }

            // Set the initialization status
            instance._init = true;

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
Core.prototype.isInit = function() {
    return this._init;
};

/**
 * Initialize the game controller.
 */
Core.prototype._initGameController = function(callback) {
    // Initialize the game controller
    this.gameController = new GameController();

    // Load all active games
    this.gameController.loadActiveGames(callback);
};

/**
 * Initialize the express app.
 *
 * @param {function} [callback] Called when finished initializing, or when an error occurred.
 */
Core.prototype._initExpressApp = function(callback) {
    // Create an Express application instance
    this.expressApp = express();

    // Disable express branding in HTTP responses
    this.expressApp.disable('x-powered-by');

    // We're done, call back if a callback is defined
    if(callback !== undefined)
        callback(null);
};

/**
 * Initialize the router.
 *
 * @param {function} [callback] Called when the router has been initialized.
 */
Core.prototype._initRouter = function(callback) {
    // Set the router instance, and initialize
    this.router = new Router(this, false);

    // Initialize
    this.router.init(callback);
};

/**
 * Initialize the database and connect.
 *
 * @param {function} [callback] Called when a connection has been made, or if an error occurred.
 */
Core.prototype._initDatabase = function(callback) {
    // Connect to the database
    MongoUtils.connect(function(err) {
        // Handle errors
        if(err !== null)
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
Core.prototype._initRedis = function(callback) {
    // Connect to Redis
    RedisUtils.connect(callback);
};

// Export the class
module.exports = Core;