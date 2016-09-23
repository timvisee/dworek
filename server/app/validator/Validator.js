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
 * Format the given mail address.
 *
 * @param {string} mail Mail address.
 *
 * @return {string} Formatted mail address.
 */
Validator.formatMail = (mail) => mail.trim().replace(/\s/g, '').toLowerCase();

/**
 * Check whether the given mail address is valid.
 * Note: This doens't check whether the given username exists.
 *
 * @param {string} mail Mail address.
 *
 * @return {boolean} True if the mail address is valid, false if not.
 */
Validator.isValidMail = (mail) => validator.isEmail(mail.trim().replace(/\s/g, ''));

/**
 * Check whether the given password is valid/allowed.
 * This doesn't check whether the given password is valid for a specific user.
 *
 * @param {string} password Password.
 *
 * @return {boolean} True if the password is valid/allowed, false if not.
 */
Validator.isValidPassword = function(password) {
    // Make sure the password isn't undefined or null
    if(password === undefined || password === null)
        return false;

    // Count the number of characters
    var charCount = password.length;

    // Make sure the length is within bounds
    return charCount >= config.validation.passwordMinLength && charCount <= config.validation.passwordMaxLength;
};

/**
 * Format the the given first name.
 *
 * @param {string} firstName First name of a user.
 *
 * @return {string} The formatted first name.
 */
Validator.formatFirstName = function(firstName) {
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
    // Make sure the first name isn't undefined or null
    if(firstName === undefined || firstName === null)
        return false;

    // Trim the first name
    firstName = firstName.trim();

    // Count the number of characters
    const charCount = firstName.length;

    // Make sure the length is within bounds
    return charCount >= config.validation.nameMinLength && charCount <= config.validation.nameMaxLength;
};

/**
 * Format the given last name.
 *
 * @param {string} lastName
 *
 * @return {string} The formatted last name.
 */
Validator.formatLastName = function(lastName) {
    // Trim the last name
    lastName = lastName.trim();

    // Determine the character position of the last word
    const charPos = lastName.lastIndexOf(' ') + 1;

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
    // Make sure the last name isn't undefined or null
    if(lastName === undefined || lastName === null)
        return false;

    // Trim the last name
    lastName = lastName.trim();

    // Count the number of characters
    const charCount = lastName.length;

    // Make sure the length is within bounds
    return charCount >= config.validation.nameMinLength && charCount <= config.validation.nameMaxLength;
};

/**
 * Format the the given nickname.
 *
 * @param {string} nickname Nickname of the user.
 *
 * @return {string} The formatted nickname.
 */
Validator.formatNickname = function(nickname) {
    // Trim the nickname, and return
    return nickname.trim();
};

/**
 * Check whether the given nickname is valid.
 *
 * @param {string} nickname Nickname.
 *
 * @return {boolean} True if the nickname is valid, false if not.
 */
Validator.isValidNickname = function(nickname) {
    // Make sure the nickname isn't undefined or null
    if(nickname === undefined || nickname === null)
        return false;

    // Trim the nickname
    nickname = nickname.trim();

    // Count the number of characters
    const charCount = nickname.length;

    // Make sure the length is within bounds
    return charCount === 0 ||
        (charCount >= config.validation.nicknameMinLength && charCount <= config.validation.nicknameMaxLength);
};

/**
 * Format the the given team name.
 *
 * @param {string} teamName Team name.
 *
 * @return {string} The formatted team name.
 */
Validator.formatTeamName = function(teamName) {
    // Trim the team name, and return
    return teamName.trim();
};

/**
 * Check whether the given team name is valid.
 *
 * @param {string} teamName Team name.
 *
 * @return {boolean} True if the team name is valid, false if not.
 */
Validator.isValidTeamName = function(teamName) {
    // Make sure the team name isn't undefined or null
    if(teamName === undefined || teamName === null)
        return false;

    // Trim the team name
    teamName = teamName.trim();

    // Count the number of characters
    const charCount = teamName.length;

    // Make sure the length is within bounds
    return (charCount >= config.validation.teamNameMinLength && charCount <= config.validation.teamNameMaxLength);
};

/**
 * Format the the given factory name.
 *
 * @param {string} factoryName Factory name.
 *
 * @return {string} The formatted factory name.
 */
Validator.formatFactoryName = function(factoryName) {
    // Trim the factory name, and return
    return factoryName.trim();
};

/**
 * Check whether the given factory name is valid.
 *
 * @param {string} factoryName Factory name.
 *
 * @return {boolean} True if the factory name is valid, false if not.
 */
Validator.isValidFactoryName = function(factoryName) {
    // Make sure the factory name isn't undefined or null
    if(factoryName === undefined || factoryName === null)
        return false;

    // Trim the factory name
    factoryName = factoryName.trim();

    // Count the number of characters
    const charCount = factoryName.length;

    // Make sure the length is within bounds
    return (charCount >= config.validation.factoryNameMinLength && charCount <= config.validation.factoryNameMaxLength);
};

/**
 * Format the the given game name.
 *
 * @param {string} gameName Game name.
 *
 * @return {string} The formatted game name.
 */
Validator.formatGameName = function(gameName) {
    // Trim the game name, and return
    return gameName.trim();
};

/**
 * Check whether the given game name is valid.
 *
 * @param {string} gameName Game name.
 *
 * @return {boolean} True if the game name is valid, false if not.
 */
Validator.isValidGameName = function(gameName) {
    // Make sure the game name isn't undefined or null
    if(gameName === undefined || gameName === null)
        return false;

    // Trim the game name
    gameName = gameName.trim();

    // Count the number of characters
    const charCount = gameName.length;

    // Make sure the length is within bounds
    return (charCount >= config.validation.gameNameMinLength && charCount <= config.validation.gameNameMaxLength);
};

// Export the class
module.exports = Validator;