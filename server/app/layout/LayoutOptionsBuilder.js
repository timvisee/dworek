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
var merge = require('utils-merge');

var appInfo = require('../../appInfo');

var CallbackLatch = require('../util/CallbackLatch');

/**
 * LayoutOptionsBuilder class.
 *
 * @class
 * @constructor
 */
var LayoutOptionsBuilder = function() {};

/**
 * Build the options for the layout.
 *
 * @param req Express request object.
 * @param res Express response object.
 * @param {function} next Callback for the next page.
 * @param {string} jadeName Jade name of the layout to render.
 * @param {string|undefined} [pageTitle] Preferred page title.
 * @param {Object|undefined} [options] Additional options.
 *
 * @return {Object} Layout options object.
 */
LayoutOptionsBuilder.build = function(req, res, next, jadeName, pageTitle, options) {
    // Create a base object
    var base = {
        app: {
            name: appInfo.APP_NAME,
            version: {
                name: appInfo.VERSION_NAME,
                code: appInfo.VERSION_CODE
            }
        },
        session: {
            valid: req.session.valid,
            user: {}
        }
    };

    // Create a callback latch
    var latch = new CallbackLatch();

    // Get the user's name if we've a session
    if(req.session.valid) {
        // Get the first name
        latch.add();
        req.session.user.getFirstName(function(err, firstName) {
            // Call back errors
            if(err !== null) {
                next(err);
                return;
            }

            // Set the first name
            base.session.user.firstName = firstName;

            // Resolve the latch
            latch.resolve();
        });

        // Get the last name
        latch.add();
        req.session.user.getLastName(function(err, lastName) {
            // Call back errors
            if(err !== null) {
                next(err);
                return;
            }

            // Set the last name
            base.session.user.lastName = lastName;

            // Resolve the latch
            latch.resolve();
        });
    }

    // Make sure the options parameter is an object
    if(!_.isObject(options))
        options = {};

    // Set the page title
    if(!options.hasOwnProperty('title')) {
        // Determine the page title if it isn't set
        if(pageTitle === undefined)
            pageTitle = jadeName.charAt(0).toUpperCase() + jadeName.slice(1).toLowerCase();

        // Set the title
        options.title = pageTitle;
    }

    // Render the page when we're done
    latch.then(function() {
        // Merge the objects
        base = merge(base, options);

        // Render the page
        res.render(jadeName, base);
    });
};

// Export the class
module.exports = LayoutOptionsBuilder;