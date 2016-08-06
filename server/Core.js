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

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var appInfo = require('./appInfo');
var routes = require('./app/route/index');
var GameController = require('./app/game/GameController');
var MongoUtils = require('./app/mongo/MongoUtils');
var RedisUtils = require('./app/redis/RedisUtils');

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
 */
Core.init = function() {
    // Initialize the game controller
    this._initGameController();

    // Initialize the express application
    this._initExpressApp();

    // Initialize the database
    this._initDatabase();

    // Initialize Redis
    this._initRedis();

    // Set the initialization status
    Core._init = true;
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
 *
 * @private
 */
Core._initGameController = function() {
    // Initialize the game controller
    Core.gameController = Object.create(GameController);

    // Load all active games
    Core.gameController.loadActiveGames();
};

/**
 * Initialize the express app.
 *
 * @private
 */
Core._initExpressApp = function() {
    // Create an Express application instance
    Core.expressApp = express();

    // Disable express branding in HTTP responses
    Core.expressApp.disable('x-powered-by');

    // TODO: Move the following code to a router class

    // Show a status message
    console.log('Starting router...');

    // Configure the view engine
    this.expressApp.set('views', path.join(__dirname, './views'));
    this.expressApp.set('view engine', 'jade');

    // Configure the favicon
    // TODO: Configure static all favicons here, instead of the default one
    this.expressApp.use(favicon(path.join(__dirname, '..', 'public', 'favicon.ico')));
    this.expressApp.use(logger('dev'));
    this.expressApp.use(bodyParser.json());
    this.expressApp.use(bodyParser.urlencoded({extended: false}));
    this.expressApp.use(cookieParser());
    this.expressApp.use(express.static(path.join(__dirname, '../public')));

    // Configuring route
    console.log("Configuring router...");

    // Add application branding in HTTP responses
    this.expressApp.use(function(req, res, next) {
        // Set the HTTP X-Powered-By header
        res.header('X-Powered-By', appInfo.APP_NAME + ' Server/' + appInfo.VERSION_NAME);

        // Route to the next handler
        next();
    });

    // Configure the router
    this.expressApp.use('/', routes);

    // Catch 404 errors, and forward them to the error handler
    this.expressApp.use(function(req, res, next) {
        // Create an error, and set the status code
        var error = new Error('Not Found');
        error.status = 404;

        // Forward the error
        next(error);
    });

    // Store this instance
    var instance = this;

    // Error handler
    this.expressApp.use(function(err, req, res, next) {
        // Determine whether we're in development mode
        var dev = instance.expressApp.get('env') === 'development';

        // Show an error page, render the stack trace if we're in development mode
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: dev ? err : {}
        });
    });

    // Show a status message
    console.log('Router started');
};

/**
 * Initialize the database and connect.
 *
 * @param {function} [callback] Called when a connection has been made, or if an error occurred.
 * @private
 */
Core._initDatabase = function(callback) {
    // Connect to the database
    MongoUtils.connect(function(err, db) {
        // Handle errors
        if(err != null)
            throw new Error('Failed to connect to MongoDB. Quitting server.');

        // TODO: Retry on connection failure

        // Callback
        if(callback !== undefined)
            callback(null, db);
    });
};

/**
 * Initialize Redis and connect.
 *
 * @param {function} [callback] Called when a connection has been made, or if an error occurred.
 * @private
 */
Core._initRedis = function(callback) {
    // Connect to Redis
    RedisUtils.connect(function(err) {
        callback(err);
    });
};

// Export the class
module.exports = Core;