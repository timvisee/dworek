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

var Core = require('./Core');
var GameController = require('./app/game/GameController');
var MongoUtils = require('./app/mongo/MongoUtils');
var RedisUtils = require('./app/redis/RedisUtils');
var Router = require('./app/router/Router');
var PathLibrary = require('./PathLibrary');
var UserModelManager = require('./app/model/user/UserModelManager');
var SessionModelManager = require('./app/model/session/SessionModelManager');
var GameModelManager = require('./app/model/game/GameModelManager');
var GameTeamModelManager = require('./app/model/gameteam/GameTeamModelManager');
var GameUserModelManager = require('./app/model/gameuser/GameUserModelManager');

/**
 * Constructor.
 *
 * @class
 * @constructor
 *
 * @param {boolean} [init] True to immediately initialize.
 */
var App = function(init) {
    /**
     * Define whether the App is initialized.
     *
     * @type {boolean} True if initialized, false if not.
     * @private
     */
    this._init = false;

    // Initialize
    if(init != undefined && init)
        this.init();
};

/**
 * Initialize the application.
 * This will start the application and it's core, initiating things like the database, Redis and the router.
 *
 * @param {function} [callback] Called when finished initializing, or when an error occurred.
 */
App.prototype.init = function(callback) {
    // Create a core instance if it hasn't been instantiated yet
    if(this.core === null)
        this.core = new Core();

    // Store the current instance
    const self = this;

    // Initialize various components in parallel
    async.parallel([
        // Print the library paths, and call back
        (initComplete) => {
            PathLibrary.printPaths();
            initComplete(null);
        },

        // Instantiate the model managers
        (initComplete) => self._initModelManagers(initComplete),

        // Initialize the game controller
        (initComplete) => self._initGameController(initComplete),

        // Initialize the express application
        (initComplete) => self._initExpressApp(initComplete),

        // Initialize the database
        (initComplete) => self._initDatabase(initComplete),

        // Initialize Redis
        (initComplete) => self._initRedis(initComplete)

    ], function(err) {
        // Make sure everything went right, callback or throw an error instead
        if(err !== null) {
            if(callback !== undefined)
                callback(err);
            else
                throw err;
            return;
        }

        // Initialize the router
        //noinspection JSAccessibilityCheck
        self._initRouter(function(err) {
            // Call back any errors, or throw it if no callback was defined
            if(err !== null) {
                if(callback !== undefined)
                    callback(err);
                else
                    throw err;
            }

            // Set the initialization status
            self._init = true;

            // Call back
            if(callback !== undefined)
                callback(null);
        });
    });
};

/**
 * Check whether the app is initialized.
 *
 * @return {boolean} True if initialized, false if not.
 */
App.prototype.isInit = function() {
    return this._init;
};

/**
 * Initialize the game controller.
 */
App.prototype._initGameController = function(callback) {
    // Initialize the game controller
    Core.gameController = new GameController();

    // Load all active games
    Core.gameController.loadActiveGames(callback);
};

/**
 * Initialize the express app.
 *
 * @param {function} [callback] Called when finished initializing, or when an error occurred.
 */
App.prototype._initExpressApp = function(callback) {
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
App.prototype._initRouter = function(callback) {
    // Set the router instance, and initialize
    Core.router = new Router(false);

    // Initialize
    Core.router.init(callback);
};

/**
 * Initialize the database and connect.
 *
 * @param {function} [callback] Called when a connection has been made, or if an error occurred.
 */
App.prototype._initDatabase = function(callback) {
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
App.prototype._initRedis = function(callback) {
    // Connect to Redis
    RedisUtils.connect(callback);
};

/**
 * Initialize all model managers.
 *
 * @param {function} [callback] Called when finished, or when an error occurred.
 */
App.prototype._initModelManagers = function(callback) {
    // Instantiate the model managers
    Core.model.userModelManager = new UserModelManager();
    Core.model.sessionModelManager = new SessionModelManager();
    Core.model.gameModelManager = new GameModelManager();
    Core.model.gameTeamModelManager = new GameTeamModelManager();

    // Call back
    if(callback !== undefined)
        callback(null);
};

// Export the class
module.exports = App;