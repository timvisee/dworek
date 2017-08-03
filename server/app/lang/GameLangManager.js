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

const Core = require("../../Core");

/**
 * @param {Object|undefined} [gameLangObject] Game language object, or nothing.
 *
 * @class
 * @constructor
 */
var GameLangManager = function(gameLangObject) {
    /**
     * Game specific language object.
     * This object must be updated manually to ensure a custom language object is used.
     *
     * @type {Object}
     */
    this.gameLangObject = (gameLangObject !== undefined && gameLangObject !== null && _.isObject(gameLangObject)) ? gameLangObject : null;
};

/**
 * Get the game specific language object.
 * This doesn't contain the global application wide language object properties.
 *
 * @returns {Object} Game specific language object.
 */
GameLangManager.prototype.getGameLangObject = function() {
    return this.gameLangObject;
};

/**
 * Set the game specific language object.
 * This shouldn't contain the global application wide language object properties.
 *
 * @param {Object|undefined} [gameLangObject] Game specific language object, or nothing.
 */
GameLangManager.prototype.setGameLangObject = function(gameLangObject) {
    // Parse the object
    if(gameLangObject === undefined || (_.isEmpty(gameLangObject)))
        gameLangObject = null;

    // Set the property
    this.gameLangObject = gameLangObject;
};

/**
 * Merge the global and game language objects, to create one resulting object.
 * This operation might be expensive and it isn't recommended to run this often.
 *
 * @returns {Object} Merged language object.
 */
GameLangManager.prototype.getMergedLangObject = function() {
    return _.merge({}, Core.langManager.getDefaultLangObject(), this.getGameLangObject());
};

/**
 * Render the text/name for the given node/key in the current language.
 * This encapsulates the text in a span element, to allow dynamic language updates on the page.
 * The result string with the text and span element is returned as a string.
 *
 * If no known text is found for the given node, the node itself is returned,
 * encapsulated between curly brackets.
 *
 * @param {string} node The node or key for the language text.
 * @param {RenderNameConfigOptions|undefined|null} [options] Options object.
 */
GameLangManager.prototype.renderNameConfig = function(node, options) {
    // Set the game and global language objects
    if(options === undefined || options === null)
        options = {};
    if(_.isEmpty(options.langObjects))
        options.langObjects = [
            GameLangManager.prototype.getGameLangObject(),
            Core.langManager.getDefaultLangObject()
        ];

    // Re-route the rendering call
    return Core.langManager.renderNameConfig(node, options);
};

// Alias for renderNameConfig
GameLangManager.prototype.__ = GameLangManager.prototype.renderNameConfig;

/**
 * An object to define name config rendering properties.
 *
 * @typedef {Object} RenderNameConfigOptions
 *
 * @param {boolean=false} [capitalizeFirst] Capitalize the first letter of the text.
 */

// Export the class
module.exports = GameLangManager;
