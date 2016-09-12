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
     * Map of cached data.
     *
     * @type {Map}
     * @private
     */
    this._cache = new Map();
};

/**
 * Check whether the cache of this object has the given field cached.
 *
 * @param {string} field Cached field.
 *
 * @returns {boolean} True if this field is available, false if not.
 */
ObjectCache.prototype.hasCache = function(field) {
    return this._cache.has(field);
};

/**
 * Get the cached value for the given field.
 *
 * @param {String} field Field.
 * @returns {*|undefined} Cached value, or undefined if the field is unknown.
 */
ObjectCache.prototype.getCache = function(field) {
    return this._cache.get(field);
};

/**
 * Get the number of cached fields.
 *
 * @returns {Number} Total number of cached fields.
 */
ObjectCache.prototype.getCacheCount = function() {
    return this._cache.size;
};

/**
 * Set a cache field.
 *
 * @param {string} field Cache field name.
 * @param {*} value Value to cache.
 */
ObjectCache.prototype.setCache = function(field, value) {
    this._cache.set(field, value);
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
 * All cache will be flushed unless specific fields are given.
 *
 * @param {Array|string} [fields] Array of fields or a specific field as a string to flush.
 */
ObjectCache.prototype.flushCache = function(fields) {
    // Flush all if no field is given
    if(fields === undefined) {
        this._cache = new Map();
        return;
    }

    // Convert the fields parameter to an array, if it isn't in array format
    if(!Array.isArray(fields))
        fields = [fields];

    // Loop through the list of fields, and delete them one by one
    for(var i = 0, fieldCount = fields.length; i < fieldCount; i++)
        this._cache.delete(fields[i]);
};

// Export the user class
module.exports = ObjectCache;
