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
var Raven = require('raven');

var config = require('../../config');

var appInfo = require('../../appInfo');
var routes = require('../route/index');
var Core = require('../../Core');
var PathLibrary = require('../../PathLibrary');
var SessionValidator = require('./middleware/SessionValidator');
var UrlFixer = require('./middleware/UrlFixer');
var LayoutRenderer = require('../layout/LayoutRenderer');

/**
 * Router class.
 *
 * @class
 * @constructor
 *
 * @param {boolean} [init] True to initialize immediately, false if not.
 */
function Router(init) {
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
    Core.expressApp.set('views', path.join(PathLibrary.getServerPath(), 'views'));
    Core.expressApp.set('view engine', 'pug');

    // Get the public path
    const publicPath = PathLibrary.getPublicPath();

    // Configure the favicon
    // TODO: Configure static all favicons here, instead of the default one
    Core.expressApp.use(favicon(path.join(publicPath, 'favicon.ico')));
    Core.expressApp.use(logger('dev'));
    Core.expressApp.use(bodyParser.json());
    Core.expressApp.use(bodyParser.urlencoded({extended: false}));
    Core.expressApp.use(cookieParser());
    Core.expressApp.use(express.static(publicPath));

    // Configuring route
    console.log('Configuring router...');

    // Add application branding in HTTP responses
    Core.expressApp.use(function(req, res, next) {
        // Set the HTTP X-Powered-By header
        res.header('X-Powered-By', appInfo.APP_NAME + ' Server/' + appInfo.VERSION_NAME);

        // Route to the next handler
        next();
    });

    // Fix malformed URLs with double slashes
    console.log('Attaching URL fixer middleware...');
    Core.expressApp.use(UrlFixer.route);

    // Attach the session validator middleware
    console.log('Attaching session validation middleware...');
    Core.expressApp.use(SessionValidator.route);

    // Configure the router
    Core.expressApp.use('/', routes);

    // Catch 404 errors, and forward them to the error handler
    Core.expressApp.use(function(req, res, next) {
        // Create an error, and set the status code
        var error = new Error('Not Found');
        error.status = 404;

        // Forward the error
        next(error);
    });

    // Error handler
    Core.expressApp.use(function(err, req, res, next) {
        // Determine whether we're in development mode
        var dev = Core.expressApp.get('env') === 'development';

        // Show an error page, render the stack trace if we're in development mode
        res.status(err.status || 500);
        LayoutRenderer.render(req, res, next, 'error', 'Whoops!', {
            message: '<i>You broke the interwebs!</i>\n\n' +
            'We can\'t load your page because some error occurred on our end.\n\n' +
            'The web administrators are freaking out right now, running around, bashing buttons, rebooting systems...\n\n' +
            'A team of wizards and magicians has been dispatched to deal with this situation.',
            showStacktrace: dev,
            statusCode: err.status,
            stacktrace: !dev ? {} : {
                message: err.message,
                status: err.status,
                stack: err.stack
            }
        });

        // Handle errors when this isn't an 404 page
        if(err.status !== 404) {
            // Capture the exception for Sentry monitoring
            if(config.sentry.enable)
                Raven.captureException(err);

            // Print the error message to the console
            console.error('An error occurred while loading a page.');
            console.error(err.stack);
        }
    });

    // Show a status message
    console.log('Router started.');

    // We're done, call back if a callback is defined
    if(callback !== undefined)
        callback(null);
};

// Export the router class
module.exports = Router;