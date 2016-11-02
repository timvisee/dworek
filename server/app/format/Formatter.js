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

var config = require('../../config');

/**
 * Formatter class.
 *
 * @class
 * @constructor
 */
var Formatter = function() {};

/**
 * Format a big number to make it more readable.
 *
 * @param {Number} num Number to format.
 * @returns {string} Formatted number.
 */
Formatter.formatBigNumber = function(num) {
    // Split the number by a dot (for decimal numbers)
    const parts = num.toString().split(".");

    // Put comma's in it
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '&#8239;');

    // Join the decimal number and return
    return parts.join(".");
};

/**
 * Format money.
 *
 * @param {Number} amount Amount of money.
 * @param {boolean} [prefixSign=true] True to prefix a money sign, false to not.
 * @returns {string} Formatted money string.
 */
Formatter.formatMoney = function(amount, prefixSign) {
    // Set the parameter defaults
    if(prefixSign == undefined)
        prefixSign = true;

    // Format the amount of money
    //noinspection JSValidateTypes
    amount = Formatter.formatBigNumber(amount);

    // Return the number, prefix the money sign if specified
    // TODO: Get the money sign from the name configuration of the current game!
    return (prefixSign ? '$' : '') + amount;
};

/**
 * Format the given amount of goods to make it better readable.
 *
 * @param {Number} amount Amount of goods.
 * @returns {string} Formatted amount of goods.
 */
Formatter.formatGoods = function(amount) {
    return formatBigNumber(amount);
};

// Export the class
module.exports = Formatter;