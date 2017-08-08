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

const _ = require("lodash");

/**
 * Constructor.
 *
 * @returns {MutexLoader} CallbackLatch instance.
 */
var MutexLoader = function() {
    /**
     * Object with loading instances.
     * @type {{}}
     * @private
     */
    this._loading = {};
};

/**
 *
 * @param {string} id Instance ID.
 * @param {function} load Function to call to load the result.
 * @param {function} callback Callback to call when done.
 */
MutexLoader.prototype.load = function(id, load, callback) {
    // Check whether we're already loading
    const isLoading = this._isLoading(id);

    // Add to the loading list
    this._addLoading(id, callback);

    // Return if we're already loading
    if(isLoading)
        return;

    // Store a reference to this
    const self = this;

    // Load
    load(function(err, result) {
        self._doneLoading(id, err, result);
    });
};

/**
 * Check whether the given ID is already being loaded.
 *
 * @param {string} id Instance ID.
 * @returns {boolean} True if already being loaded, false if not.
 * @private
 */
MutexLoader.prototype._isLoading = function(id) {
    return this._loading.hasOwnProperty(id);
};

/**
 * Add a loading callback.
 *
 * @param {string} id Instance ID.
 * @param {function} resultCallback Callback to call when done.
 * @private
 */
MutexLoader.prototype._addLoading = function(id, resultCallback) {
    // Add a key if it doesn't exist
    if(!this._loading.hasOwnProperty(id))
        this._loading[id] = [];

    // Push the callback in the array
    this._loading[id].push(resultCallback);
};

/**
 * Call when the value has done loading.
 *
 * @param {string} id Instance ID.
 * @param {Error|null} err Error instance if an error occurred.
 * @param {*} result Result object.
 * @private
 */
MutexLoader.prototype._doneLoading = function(id, err, result) {
    // Just return if there's nothing to call back to
    if(!this._loading.hasOwnProperty(id))
        return;

    // Loop through the callbacks to call them one by one
    this._loading[id].forEach(function(callback) {
        // Call back if it's a function
        if(_.isFunction(callback))
            callback(err, result);
    });

    // Delete the waiting
    delete this._loading[id];
};

// Export the user class
module.exports = MutexLoader;
