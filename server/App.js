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

var Core = require('./Core');

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
     * Core instance.
     *
     * @type {Core}
     */
    this.core = null;

    // Initialize
    if(init != undefined && init)
        this.init();
};

/**
 * Initialize the application.
 * This will start the application and it's core, initiating things like the database, Redis and the router.
 *
 * @param {function} [callback] Called when finished initializing, or when an error occurred.
 */
App.prototype.init = function(callback) {
    // Create a core instance if it hasn't been instantiated yet
    if(this.core === null)
        this.core = new Core();

    // Call back if the core is already initialized
    if(this.core.isInit()) {
        callback(null);
        return;
    }

    // Initialize the core
    this.core.init(callback);
};

// Export the class
module.exports = App;