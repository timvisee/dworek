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

var appInfo = require('../../appInfo');
var routes = require('../route/index');
var Core = require('../../Core');
var PathLibrary = require('../../PathLibrary');

/**
 * Router class.
 *
 * @class
 * @constructor
 *
 * @param {Core} core Core instance.
 * @param {boolean} [init] True to initialize immediately, false if not.
 */
function Router(core, init) {
    /**
     * Core instance.
     *
     * @type {Core}
     */
    this.core = core;

    // Initialize
    if(init === true)
        this.init();
}

/**
 * Initialize the router.
 *
 * @param {function} [callback] Called when finished initializing.
 */
Router.prototype.init = function(callback) {
    // Show a status message
    console.log('Starting router...');

    // Configure the view engine
    this.core.expressApp.set('views', path.join(PathLibrary.getServerPath(), 'views'));
    this.core.expressApp.set('view engine', 'jade');

    // Get the public path
    const publicPath = PathLibrary.getPublicPath();

    // Configure the favicon
    // TODO: Configure static all favicons here, instead of the default one
    this.core.expressApp.use(favicon(path.join(publicPath, 'favicon.ico')));
    this.core.expressApp.use(logger('dev'));
    this.core.expressApp.use(bodyParser.json());
    this.core.expressApp.use(bodyParser.urlencoded({extended: false}));
    this.core.expressApp.use(cookieParser());
    this.core.expressApp.use(express.static(publicPath));

    // Configuring route
    console.log("Configuring router...");

    // Add application branding in HTTP responses
    this.core.expressApp.use(function(req, res, next) {
        // Set the HTTP X-Powered-By header
        res.header('X-Powered-By', appInfo.APP_NAME + ' Server/' + appInfo.VERSION_NAME);

        // Route to the next handler
        next();
    });

    // Configure the router
    this.core.expressApp.use('/', routes);

    // Catch 404 errors, and forward them to the error handler
    this.core.expressApp.use(function(req, res, next) {
        // Create an error, and set the status code
        var error = new Error('Not Found');
        error.status = 404;

        // Forward the error
        next(error);
    });

    // Store this instance
    var instance = this;

    // Error handler
    this.core.expressApp.use(function(err, req, res, next) {
        // Determine whether we're in development mode
        var dev = instance.core.expressApp.get('env') === 'development';

        // Show an error page, render the stack trace if we're in development mode
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: dev ? err : {}
        });
    });

    // Show a status message
    console.log('Router started');

    // We're done, call back if a callback is defined
    if(callback !== undefined)
        callback(null);
};

// Export the router class
module.exports = Router;