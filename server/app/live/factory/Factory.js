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

var mongo = require('mongodb');
var ObjectId = mongo.ObjectId;

var config = require('../../../config');

var Core = require('../../../Core');
var FactoryModel = require('../../model/factory/FactoryModel');

/**
 * Factory class.
 *
 * @param {FactoryModel|ObjectId|string} factory Factory model instance or the ID of a factory.
 * @param {Game} game Game instance.
 *
 * @class
 * @constructor
 */
var Factory = function(factory, game) {
    /**
     * ID of the factory this object corresponds to.
     * @type {ObjectId}
     */
    this._id = null;

    /**
     * Factory model instance if available.
     * @type {FactoryModel|null} Factory model instance or null if no instance is currently available.
     */
    this._model = null;

    /**
     * Live game instance.
     * @type {Game} Game.
     * @private
     */
    this._game = game;

    // Get and set the factory ID
    if(factory instanceof FactoryModel)
        this._id = factory.getId();
    else if(!(factory instanceof ObjectId) && ObjectId.isValid(factory))
        this._id = new ObjectId(factory);
    else if(!(factory instanceof ObjectId))
        throw new Error('Invalid factory instance or ID');
    else
        this._id = factory;

    // Store the factory model instance if any was given
    if(factory instanceof FactoryModel)
        this._model = factory;
};

/**
 * Get the factory ID for this factory.
 *
 * @return {ObjectId} Factory ID.
 */
Factory.prototype.getId = function() {
    return this._id;
};

/**
 * Get the hexadecimal ID representation of the factory.
 *
 * @returns {string} Factory ID as hexadecimal string.
 */
Factory.prototype.getIdHex = function() {
    return this.getId().toString();
};

/**
 * Check whether the give factory instance or ID equals this factory.
 *
 * @param {FactoryModel|ObjectId|string} factory Factory instance or the factory ID.
 * @return {boolean} True if this factory equals the given factory instance.
 */
Factory.prototype.isFactory = function(factory) {
    // Get the factory ID as an ObjectId
    if(factory instanceof FactoryModel)
        factory = factory.getId();
    else if(!(factory instanceof ObjectId) && ObjectId.isValid(factory))
        factory = new ObjectId(factory);
    else if(!(factory instanceof ObjectId))
        throw Error('Invalid factory ID');

    // Compare the factory ID
    return this._id.equals(factory);
};

/**
 * Get the factory model.
 *
 * @return {FactoryModel} Factory model instance.
 */
Factory.prototype.getFactoryModel = function() {
    // Return the model if it isn't null
    if(this._model !== null)
        return this._model;

    // Create a factory model for the known ID, store and return it
    return this._model = Core.model.factoryModelManager._instanceManager.create(this._id);
};

/**
 * Get the factory name.
 *
 * @param {Factory~getNameCallback} callback Callback with the result.
 */
Factory.prototype.getName = function(callback) {
    this.getFactoryModel().getName(callback);
};

/**
 * @callback Factory~getNameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {string=} Factory name.
 */

/**
 * Get the live game instance.
 * @return {Game} Game.
 */
Factory.prototype.getGame = function() {
    return this._game;
};

/**
 * Unload this live factory instance.
 *
 * @param {Factory~loadCallback} callback Called on success or when an error occurred.
 */
Factory.prototype.load = function(callback) {};

/**
 * Called on success or when an error occurred.
 *
 * @callback Factory~loadCallback
 * @param {Error|null} Error instance if an error occurred, null on success.kk
 */

/**
 * Unload this live factory instance.
 */
Factory.prototype.unload = function() {};

/**
 * @callback Factory~calculateCostCallback
 * @param {Error|null} Error instance if an error occurred.
 * @param {Number=} Factory cost.
 */

// Export the class
module.exports = Factory;

