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
var mongo = require('mongodb');
var ObjectId = mongo.ObjectId;

var Core = require('../../../Core');
var Factory = require('./Factory');
var FactoryModel = require('../../model/factory/FactoryModel');
var CallbackLatch = require('../../util/CallbackLatch');

/**
 * FactoryManager class.
 *
 * @param {Game} game Live game instance.
 *
 * @class
 * @constructor
 */
var FactoryManager = function(game) {
    /**
     * Live game instance.
     * @type {Game}
     */
    this.game = game;

    /**
     * List containing all loaded factories.
     *
     * @type {Array} Array of factories.
     */
    this.factories = [];
};

/**
 * Get the given factory.
 *
 * @param {FactoryModel|ObjectId|string} factoryId Factory instance or the factory ID to get the factory for.
 * @param {FactoryManager~getFactoryCallback} callback Called back with the factory or when an error occurred.
 */
FactoryManager.prototype.getFactory = function(factoryId, callback) {
    // Get the factory ID as an ObjectId
    if(factoryId instanceof FactoryModel)
        factoryId = factoryId.getId();
    else if(!(factoryId instanceof ObjectId) && ObjectId.isValid(factoryId))
        factoryId = new ObjectId(factoryId);
    else if(!(factoryId instanceof ObjectId)) {
        callback(new Error('Invalid factory ID'));
        return;
    }

    // Get the factory if it's already loaded
    const loadedFactory = this.getLoadedFactory(factoryId);
    if(loadedFactory !== null) {
        callback(null, loadedFactory);
        return;
    }

    // Store this instance
    const self = this;

    // Make sure the factory ID is valid
    Core.model.factoryModelManager.isValidFactoryId(factoryId, function(err, valid) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Make sure the factory is valid
        if(!valid) {
            callback(null, null);
            return;
        }

        // Create a factory model instance
        const factoryModel = Core.model.factoryModelManager._instanceManager.create(factoryId);

        // Make sure the factory is part of the current game
        factoryModel.getGame(function(err, result) {
            // Call back errors
            if(err !== null) {
                callback(err);
                return;
            }

            // Make sure the factory is part of this game
            if(!this.getGame().getId().equals(result.getId())) {
                callback(null, null);
                return;
            }

            // Create a factory instance for this model
            var newFactory = new Factory(factoryModel, this.game);

            // Add the factory to the list of loaded factories
            self.factories.push(newFactory);

            // Call back the factory
            callback(null, newFactory);
        });
    });
};

/**
 * Called back with the factory or when an error occurred.
 *
 * @callback FactoryController~getFactoryCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Factory|null=} Factory instance, null if the factory isn't active or if the factory is invalid.
 */

/**
 * Get the loaded factory instance for the given factory ID.
 * Null will be returned if no factory is loaded for the given factory ID.
 *
 * @param {FactoryModel|ObjectId|string} factoryId Factory instance or the factory ID to get the factory for.
 */
FactoryManager.prototype.getLoadedFactory = function(factoryId) {
    // Get the factory ID as an ObjectId
    if(factoryId instanceof FactoryModel)
        factoryId = factoryId.getId();
    else if(!(factoryId instanceof ObjectId) && ObjectId.isValid(factoryId))
        factoryId = new ObjectId(factoryId);
    else if(!(factoryId instanceof ObjectId))
        throw new Error('Invalid factory ID');

    // Keep track of the found factory
    var result = null;

    // Loop through the list of factories
    this.factories.forEach(function(entry) {
        // Skip if we already found a factory
        if(result != null)
            return;

        // Check whether the factory ID equals the factory
        if(entry.isFactory(factoryId))
            result = entry;
    });

    // Return the result
    return result;
};

/**
 * Check whether the factory for the given factory ID is loaded.
 *
 * @param {FactoryModel|ObjectId|string} factoryId Factory instance or the factory ID.
 * @return {boolean} True if the factory is currently loaded, false if not.
 */
FactoryManager.prototype.isFactoryLoaded = function(factoryId) {
    return this.getLoadedFactory(factoryId) != null;
};

/**
 * Get the number of loaded factories.
 *
 * @returns {Number} Number of loaded factories.
 */
FactoryManager.prototype.getLoadedFactoryCount = function() {
    return this.factories.length;
};

/**
 * Load all factories for this game.
 *
 * @param {FactoryManager~loadCallback} [callback] Callback called when done loading.
 */
FactoryManager.prototype.load = function(callback) {
    // Store this instance
    const self = this;

    // Determine whether we called back
    var calledBack = false;

    // Get the game mode
    const gameModel = this.game.getGameModel();

    // Load all factories for this game
    Core.model.factoryModelManager.getFactories(gameModel, null, function(err, factories) {
        // Call back errors
        if(err !== null) {
            if(_.isFunction(callback))
                callback(err);
            return;
        }

        // Unload all currently loaded factories
        self.unload();

        // Create a callback latch
        var latch = new CallbackLatch();

        // Loop through the list of factories
        factories.forEach(function(factory) {
            // Create a factory instance
            const factoryInstance = new Factory(factory, self.game);

            // Load the factory instance
            latch.add();
            factoryInstance.load(function(err) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        if(_.isFunction(callback))
                            callback(err);
                    calledBack = true;
                    return;
                }

                // Add the factory instance to the list
                self.factories.push(factoryInstance);

                // Resolve the latch
                latch.resolve();
            });
        });

        // Call back when we're done loading
        latch.then(function() {
            if(_.isFunction(callback))
                callback(null);
        });
    });
};

/**
 * @callback FactoryManager~loadCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 */

/**
 * Unload all loaded factories.
 */
FactoryManager.prototype.unload = function() {
    // Loop through the list of factories
    this.factories.forEach(function(factory) {
        // Unload the factory
        factory.unload();
    });
};

// Export the class
module.exports = FactoryManager;