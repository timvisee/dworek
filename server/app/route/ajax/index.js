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
var router = express.Router();

var Core = require('../../../Core');
var user = require('./user/index');

// Index page
router.get('/', (req, res, next) => next(new Error('No AJAX endpoint specified')));

// User directory
router.use('/user', user);

// Catch 404 errors, and forward them to the error handler
router.use(function(req, res, next) {
    // Create an error, and set the status code
    var error = new Error('Not Found');
    error.status = 404;

    // Forward the error
    next(error);
});

// Error handler
router.use(function(err, req, res) {
    // Determine whether we're in development mode
    var dev = Core.expressApp.get('env') === 'development';

    // Show an error page, render the stack trace if we're in development mode
    res.status(err.status || 500);

    // Create a response object
    var responseObject = {
        status: 'error',
        error: {
            message: err.message,
            status: err.status
        }
    };

    // Append the stack trace if we're in development mode
    if(dev)
        responseObject.error.stacktrace = err.stack;

    // Respond with the response object
    res.json(responseObject);

    // Print the error message to the console
    console.error(err.stack);
});

// Export the router
module.exports = router;
