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

var routes = require('./app/routes/index');

var appInfo = require('./appInfo');
var MongoUtils = require('./app/mongo/MongoUtils');
var RedisUtils = require('./app/redis/RedisUtils');

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
     * Express application instance.
     */
    this.expressApp = null;

    // Initialize
    if(init != undefined && init)
        this.init();
};

/**
 * Initialize the application.
 * This will start the application instance, database connection, router and so on.
 */
App.prototype.init = function() {
    // Create an Express application instance
    this.expressApp = express();

    // Disable express branding in HTTP responses
    this.expressApp.disable('x-powered-by');

    // Create an app instance to make it accessible from the callback
    var instance = this;

    // Connect to the database
    instance.connectDatabase(function() {
        // Connect to Redis
        instance.connectRedis();

        // Start the router
        instance.startRouter();
    });
};

/**
 * Connect to the database.
 *
 * @param {App~connectDatabaseCallback} callback Callback.
 */
App.prototype.connectDatabase = function(callback) {
    // Connect to the database
    MongoUtils.connect(function(err, db) {
        // Handle errors
        if(err != null)
            throw new Error('Failed to connect to MongoDB. Quitting server.');

        // TODO: Retry on connection failure

        // Callback
        callback(null, db);
    });
};

/**
 * Callback, called when a connection to the database has been made.
 *
 * @callback App~connectDatabaseCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {MongoClient|null} MongoDB client instance if a connection has been made, null otherwise.
 */

/**
 * Connect to Redis.
 *
 * @param {App~connectRedisCallback} [callback] Callback.
 */
App.prototype.connectRedis = function(callback) {
    // Connect to Redis
    RedisUtils.connect(callback);
};

/**
 * Callback, called when Redis connected or failed to connect.
 *
 * @callback App~connectRedisCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {RedisClient|null} Redis client instance if a connection has been made, null otherwise.
 */

/**
 * Start the router.
 */
App.prototype.startRouter = function() {
    // Show a status message
    console.log("Starting router...");

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

    // Configuring routes
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
    console.log("Router started");
};

/**
 * Get the Express application instance.
 *
 * @returns {*}
 */
App.prototype.getExpressApp = function() {
    return this.expressApp;
};

// Export the class
module.exports = App;

