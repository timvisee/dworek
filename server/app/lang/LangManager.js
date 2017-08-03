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

var Formatter = require('../format/Formatter');

var config = require('../../config');

/**
 * Default render name config options object.
 *
 * @type {RenderNameConfigOptions}
 */
const RENDER_NAME_CONFIG_OPTIONS_DEFAULTS = {
    capitalizeFirst: false
};

/**
 * @class
 * @constructor
 */
var LangManager = function() {};

/**
 * Get the default application wide language object.
 *
 * @returns {Object} Default languages object.
 */
LangManager.prototype.getDefaultLangObject = function() {
    return config.lang.defaults;
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
LangManager.prototype.renderNameConfig = function(node, options) {
    // Set the options to their defaults if unset
    if(options === undefined || options === null)
        options = {};

    // Merge the options
    // TODO: Is this merge correct, and not leaving references behind?
    options = _.merge({}, RENDER_NAME_CONFIG_OPTIONS_DEFAULTS, options);

    // Parse the language objects option
    if(_.isObject(options.langObjects) && !_.isArray(options.langObjects))
        options.langObjects = [options.langObjects];
    else if(options.langObjects === undefined || options.langObjects === null || (_.isEmpty(options.langObjects)))
        options.langObjects = [this.getDefaultLangObject()];

    // Trim the node string
    node = node.trim();

    // Get the language text value
    var text = undefined;

    // Loop through the language objects to fetch the language value
    options.langObjects.forEach(function(langObject) {
        // Return early if we already found something or if this object is null, undefined or empty
        if(text !== undefined || langObject === undefined || langObject === null || _.isEmpty(langObject))
            return;

        // Try to find the value in the given language object
        text = _.get(langObject, node, undefined);
    });

    // Get the default value if nothing was found for the given node
    if(text === undefined)
        text = _.get(config.lang.defaults, node, undefined);

    // Capitalize the first character if set
    if(text !== undefined && options.capitalizeFirst && text.length > 0)
        text = Formatter.capitalizeFirst(text);

    // Set the text to the node itself if it's still undefined,
    // because the node was invalid
    if(text === undefined || text.length === 0)
        text = '{' + node + '}';

    // Replace the dots in the node string with hyphens to make it class compatible
    const textClass = text.replace('.', '-');

    // Encapsulate and return the string in the span element
    return '<span class="lang lang-' + textClass + '">' + text + '</span>';
};

// Alias for renderNameConfig
LangManager.prototype.__= LangManager.prototype.renderNameConfig;

/**
 * An object to define name config rendering properties.
 *
 * @typedef {Object} RenderNameConfigOptions
 *
 * @param {boolean=false} [capitalizeFirst] Capitalize the first letter of the text.
 * @param {Object[]} [langObjects] Objects to get language values from. The lower the index of the object, the higher the priority.
 */

// Export the class
module.exports = LangManager;
