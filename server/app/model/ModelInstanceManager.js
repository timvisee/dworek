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

var _ = require('lodash');
var ObjectId = require('mongodb').ObjectId;

/**
 * ModelInstanceManager class.
 *
 * @param {Function} modelConstructor Constructor for the model.
 *
 * @class
 * @constructor
 */
var ModelInstanceManager = function(modelConstructor) {
    /**
     * Weak map of model instances.
     *
     * @type {WeakMap}
     * @private
     */
    this._instances = new WeakMap();

    /**
     * Model constructor.
     *
     * @type {Function}
     * @private
     */
    this._modelConstructor = modelConstructor;
};

/**
 * Create a new model instance for the given model object ID.
 *
 * @param {ObjectId|String} id Object ID.
 * @return {Object} Model object instance.
 */
ModelInstanceManager.prototype.create = function(id) {
    // Parse the ID
    id = this._parseId(id);

    // Return the instance if it's known
    if(this.has(id))
        return this._instances.get(id);

    // Create a new model instance
    var model = new this._modelConstructor(new ObjectId(id));

    // Put the object in the instances map
    this._instances.set(id, model);

    // Return the instance
    return model;
};

/**
 * Get the instance for a given object ID.
 *
 * @param {ObjectId|String} id Object ID.
 * @return {Object|undefined} Model object instance or undefined if no instance with the given ID is known.
 */
ModelInstanceManager.prototype.get = function(id) {
    return this._instances.get(this._parseId(id));
};

/**
 * Check whether an instance for the given object ID exists.
 *
 * @param {ObjectId|String} id Object ID.
 * @return {boolean} True if an instance exists, false if not.
 */
ModelInstanceManager.prototype.has = function(id) {
    return this._instances.has(this._parseId(id));
};

/**
 * Parse an object ID to make it usable as key in the instances map.
 *
 * @param {ObjectId|String} id Object ID.
 * @return {string} Parsed object ID.
 *
 * @private
 */
ModelInstanceManager.prototype._parseId = function(id) {
    // Convert the ID to a string if it isn't
    if(!_.isString(id))
        id = id.toString();

    // Lowercase and return the string
    return id.toLowerCase();
};

/**
 * Clear the list of instances.
 */
ModelInstanceManager.prototype.clear = function() {
    this._instances = new WeakMap();
};

// Export the class
module.exports = ModelInstanceManager;