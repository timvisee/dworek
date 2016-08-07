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

var path = require('path');

/**
 * PathLibrary class.
 *
 * Warning: This class must be updated when the project structure changes, to prevent invalid relative paths.
 *
 * @class
 * @constructor
 */
var PathLibrary = function() {};

/**
 * Get the base application path.
 *
 * @return {String} Base path.
 */
PathLibrary.getBasePath = function() {
    // Return the cached base path if available
    if(this._basePath !== undefined)
        return this._basePath;

    // Determine the base path
    this._basePath = path.join(__dirname, '..');

    // Return the base path
    return this._basePath;
};

/**
 * Get the public path.
 *
 * @return {String} Public path.
 */
PathLibrary.getPublicPath = function() {
    // Return the cached public path if available
    if(this._publicPath !== undefined)
        return this._publicPath;

    // Determine the public path
    this._publicPath = path.join(this.getBasePath(), 'public');

    // Return the public path
    return this._publicPath;
};

/**
 * Get the server path.
 *
 * @return {String} Server path.
 */
PathLibrary.getServerPath = function() {
    // Return the cached server path if available
    if(this._serverPath !== undefined)
        return this._serverPath;

    // Determine the server path
    this._serverPath = path.join(this.getBasePath(), 'server');

    // Return the server path
    return this._serverPath;
};

/**
 * Print the paths to the console.
 */
PathLibrary.printPaths = function() {
    // Print the base and public directory
    console.log('Root directory: ' + this.getBasePath());
    console.log('Server directory: ' + this.getServerPath());
    console.log('Public directory: ' + this.getPublicPath());
};

// Export the class
module.exports = PathLibrary;