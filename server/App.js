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
var http = require('http');

var config = require('./config');
var debug = require('debug')(config.debug.name);

var Core = require('./Core');
var GameController = require('./app/live/game/GameController');
var MongoUtils = require('./app/mongo/MongoUtils');
var RedisUtils = require('./app/redis/RedisUtils');
var Router = require('./app/router/Router');
var PathLibrary = require('./PathLibrary');
var UserModelManager = require('./app/model/user/UserModelManager');
var SessionModelManager = require('./app/model/session/SessionModelManager');
var GameModelManager = require('./app/model/game/GameModelManager');
var GameTeamModelManager = require('./app/model/gameteam/GameTeamModelManager');
var GameUserModelManager = require('./app/model/gameuser/GameUserModelManager');
var RealTime = require('./app/realtime/RealTime');
var PortUtils = require('./app/util/PortUtils');

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

    /**
     * The port that is used for the web interface.
     * @type {Number}
     * @private
     */
    this._webPort = null;

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
        (initComplete) => self._initExpressApp(function(err) {
            // Call back errors
            if(err !== null) {
                initComplete(err);
                return;
            }

            // Initialize the web server
            //noinspection JSAccessibilityCheck
            self._initWebServer();

            // Initialize the real time server
            //noinspection JSAccessibilityCheck
            self._initRealTime(initComplete);
        }),

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
 * Initialize the web server.
 *
 * @private
 */
App.prototype._initWebServer = function() {
    // Set the web listening port
    Core._webPort = PortUtils.normalizePort(config.web.port);
    Core.expressApp.set('port', Core._webPort);

    // Create the HTTP server
    Core.server = http.createServer(Core.expressApp);

    // Listen on provided port, on all network interfaces.
    Core.server.listen(Core._webPort);
    Core.server.on('error', _webServerOnError);
    Core.server.on('listening', _webServerOnListening);
};

/**
 * Event listener for HTTP server error event.
 *
 * @throws
 */
function _webServerOnError(error) {
    // Make sure this originates from the listen call
    if(error.syscall !== 'listen')
        throw error;

    // Build a port/pipe string
    var bind = typeof this._webPort === 'string'
        ? 'Pipe ' + this._webPort
        : 'Port ' + this._webPort;

    // Handle specific listen errors with friendly messages
    switch(error.code) {
        case 'EACCES':
            // No access to listen to the given port
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;

        case 'EADDRINUSE':
            // The port is already in use
            console.error(bind + ' is already in use');
            process.exit(1);
            break;

        default:
            // Throw the error
            throw error;
    }
}

/**
 * Event listener for HTTP server listening event.
 */
function _webServerOnListening() {
    // Get the address
    var address = Core.server.address();

    // Build a port/pipe string
    var bind = typeof address === 'string'
        ? 'pipe ' + address
        : 'port ' + address.port;

    // Debug a listening message
    debug('Web server listening on ' + bind);
}

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
    // Model manager instances
    var modelManagers = [];

    // Instantiate the model managers
    modelManagers.push(Core.model.userModelManager = new UserModelManager());
    modelManagers.push(Core.model.sessionModelManager = new SessionModelManager());
    modelManagers.push(Core.model.gameModelManager = new GameModelManager());
    modelManagers.push(Core.model.gameTeamModelManager = new GameTeamModelManager());
    modelManagers.push(Core.model.gameUserModelManager = new GameUserModelManager());

    // Create an interval to clear all internal model caches
    setInterval(function() {
        // Loop through the list of model managers, and clear the instance managers
        modelManagers.forEach((modelManager) => modelManager._instanceManager.clear(true));

    }, config.cache.internal.flushInterval);

    // Call back
    if(callback !== undefined)
        callback(null);
};

/**
 * Initialize the real time server.
 *
 * @param {App~_initRealTimeCallback} callback Called on success, or when an error occurred.
 * @private
 */
App.prototype._initRealTime = function(callback) {
    // Initialize the real time server
    Core.realTime = new RealTime();

    // Start the real time server
    Core.realTime.start();

    // Call back
    callback(null);
};

/**
 * Called on success, or when an error occurred.
 *
 * @callback App~_initRealTimeCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 */

// Export the class
module.exports = App;