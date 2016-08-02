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

var app = express();

var routes = require('./routes/index');

var appInfo = require('./appInfo');

// Show an initialization message
console.log('Initializing ' + appInfo.APP_NAME + ' v' + appInfo.VERSION_NAME + ' (' + appInfo.VERSION_CODE + ')...');

// Configure the template/view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Configure the favicon
// TODO: Configure static favicons here
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// Configure the logger, body parser, cookie parser and the static public directory
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Configure the base routes
app.use('/', routes);

// Catch 404 errors, and forward them to the error handler
app.use(function(req, res, next) {
    // Create an error, and set the status code
    var error = new Error('Not Found');
    error.status = 404;

    // Forward the error
    next(error);
});

// Error handler
app.use(function(err, req, res, next) {
    // Determine whether we're in development mode
    var dev = app.get('env') === 'development';

    // Show an error page, render the stack trace if we're in development mode
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: dev ? err : {}
    });
});

// Export the module
module.exports = app;
