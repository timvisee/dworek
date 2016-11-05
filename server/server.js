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

var appInfo = require('./appInfo');
var App = require('./App');

/**
 * Initialize.
 */
function init() {
    // Starting the application
    console.log('Starting ' + appInfo.APP_NAME + ' v' + appInfo.VERSION_NAME + ' (' + appInfo.VERSION_CODE + ')' + '...');

    // Print the NodeJS version that is used
    console.log('Running on NodeJS ' + process.version);

    // Initialize the application
    app.init(function(err) {
        // Throw errors
        if(err !== null)
            throw err;
    });
}

// Create an app instance
var app = new App(false);

// Initialize
init();
