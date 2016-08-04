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
 * Constructor.
 *
 * @returns {ObjectCache} ObjectCache instance.
 */
var ObjectCache = function() {
    /**
     * JSON object of cached data.
     *
     * @private
     */
    this._cache = {};
};

/**
 * Check whether the cache of this object has the given field cached.
 *
 * @param {string} field Cached field.
 *
 * @returns {boolean} True if this field is available, false if not.
 */
ObjectCache.prototype.hasCache = function(field) {
    return this._cache.hasOwnProperty(field);
};

/**
 * Get the cached value for the given field.
 *
 * @param {string} field Field.
 * @returns {*} Cached value.
 */
ObjectCache.prototype.layerGetLocalCache = function(field) {
    return this._cache[field];
};

/**
 * Set a cache field.
 *
 * @param {string} field Cache field name.
 * @param {*} value Value to cache.
 */
ObjectCache.prototype.setCache = function(field, value) {
    this._cache[field] = value;
};

/**
 * Cache multiple fields from the given JSON object.
 *
 * @param {object} values Object with fields to cache.
 */
ObjectCache.prototype.setCacheMultiple = function(values) {
    // Make sure the given value isn't null or undefined
    if(values == undefined || values == null)
        return;

    // Loop through all keys in the object, and add them individually
    for(var key in values)
        // Make sure we aren't handling prototype fields
        if(values.hasOwnProperty(key))
            this.setCache(key, values[key]);
};

/**
 * Flush the data that is currently cached in this object.
 * All cache will be flushed unless a specific field is given.
 *
 * @param {string} [field] Field to flush.
 */
ObjectCache.prototype.flushCache = function(field) {
    // Flush all if no field is given
    if(field == undefined) {
        this._cache = {};
        return;
    }

    // Flush the given field, if available
    delete this._cache[field];
};

// Export the user class
module.exports = ObjectCache;
