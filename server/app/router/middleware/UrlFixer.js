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

var config = require('../../../config');

/**
 * UrlFixer middleware class.
 *
 * @class
 * @constructor
 */
var UrlFixer = function() {};

/**
 * Middleware route.
 *
 * @param {*} req Express request.
 * @param {*} res Express response.
 * @param {function} next Next callback.
 */
UrlFixer.route = function(req, res, next) {
    // Check if there are any double slashes in the URL, continue if there aren't
    if(!config.web.fixUrl || String(req.originalUrl).match(/\/{2,}/gi) === null) {
        next();
        return;
    }

    // Determine the new URL
    const newUrl = String(req.originalUrl).replace(/\/{2,}/gi, '/');

    // Log a message to the console
    console.log('Modified malformed client URL: \'' + req.originalUrl + '\' to \'' + newUrl + '\'');

    // Update the original and routing URL
    req.originalUrl = newUrl;
    req.url = newUrl;

    // We're done
    next();
};

// Export the class
module.exports = UrlFixer;