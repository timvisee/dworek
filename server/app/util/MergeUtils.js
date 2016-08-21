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

/**
 * MergeUtils class.
 *
 * @class
 * @constructor
 */
var MergeUtils = function() {};

/**
 * Merge an object recursively.
 * Object b overwrites a.
 *
 * @param {Object} a Object A.
 * @param {Object} b Object B.
 * @param {boolean} [recursive=true] True to merge recursively, false to merge flat objects.
 * @return {*} Merged object.
 */
MergeUtils.merge = function(a, b, recursive) {
    // Set the default value for the recursive param
    if(recursive === undefined)
        recursive = true;

    // Make sure both objects are given
    if(_.isObject(a) && _.isObject(b)) {
        // Loop through all the keys
        for(var key in b) {
            // Check whether we should merge two objects recursively, or whether we should merge flag
            if(recursive && _.isObject(a[key]) && _.isObject(b[key]))
                a[key] = MergeUtils.merge(a[key], b[key], true);
            else
                a[key] = b[key];
        }
    }

    // Return the object
    return a;
};

// Export the class
module.exports = MergeUtils;