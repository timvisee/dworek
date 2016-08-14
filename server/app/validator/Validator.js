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

var validator = require('validator');

var config = require('../../config');

/**
 * Validator class.
 *
 * @class
 * @constructor
 */
var Validator = function() {};

/**
 * Parse the given mail address.
 *
 * @param {string} mail Mail address.
 *
 * @return {string} Parsed mail address.
 */
Validator.parseMail = (mail) => mail.trim().toLowerCase();

/**
 * Check whether the given mail address is valid.
 * Note: This doens't check whether the given username exists.
 *
 * @param {string} mail Mail address.
 *
 * @return {boolean} True if the mail address is valid, false if not.
 */
Validator.isValidMail = (mail) => validator.isEmail(mail);

/**
 * Check whether the given password is valid/allowed.
 * This doesn't check whether the given password is valid for a specific user.
 *
 * @param {string} password Password.
 *
 * @return {boolean} True if the password is valid/allowed, false if not.
 */
Validator.isValidPassword = function(password) {
    // TODO: Validate the password length
};

/**
 * Parse the the given first name.
 *
 * @param {string} firstName First name of a user.
 *
 * @return {string} The parsed first name.
 */
Validator.parseFirstName = function(firstName) {
    // Trim the first name
    firstName = firstName.trim();

    // Capitalize the first character, and return
    return firstName[0].toUpperCase() + firstName.slice(1).toLowerCase();
};

/**
 * Check whether the given first name is valid.
 *
 * @param {string} firstName First name.
 *
 * @return {boolean} True if the first name is valid, false if not.
 */
Validator.isValidFirstName = function(firstName) {
    // TODO: Validate the first name length.
};

/**
 * Parse the given last name.
 *
 * @param {string} lastName
 *
 * @return {string} The parsed last name.
 */
Validator.parseLastName = function(lastName) {
    // Trim the last name
    lastName = lastName.trim();

    // Determine the character position of the last word
    var charPos = lastName.lastIndexOf(' ') + 1;

    // Format and return the last name
    return lastName.substring(0, charPos).toLowerCase() +
        lastName.charAt(charPos).toUpperCase() +
        lastName.substring(charPos + 1).toLowerCase();
};

/**
 * Check whether the given last name is valid.
 *
 * @param {string} lastName Last name.
 *
 * @return {boolean} True if the last name is valid, false if not.
 */
Validator.isValidLastName = function(lastName) {
    // TODO: Validate the last name length
};

// Export the class
module.exports = Validator;