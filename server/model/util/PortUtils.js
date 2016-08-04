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

/**
 * PortUtils class.
 *
 * @class
 * @constructor
 */
var PortUtils = function() {};

/**
 * Normalize a port number.
 *
 * @param {number|string} val Port number, or named pipe.
 *
 * @returns {number|string|boolean} Port number, or named pipe. False is returned if the port is invalid.
 */
PortUtils.normalizePort = function(val) {
    // Parse the port as integer
    var port = parseInt(val, 10);

    // Make sure we're working with a number, not a named pipe
    if(isNaN(port))
        return val;

    // Port number
    if(port >= 0)
        return port;

    // Failed, return false
    return false;
};

// Export the class
module.exports = PortUtils;