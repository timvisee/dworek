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

// Export the module
module.exports = {

    /**(
     * Deserialize an object from a string.
     *
     * @param {String} objString Object string.
     * @return {Object|null} Object.
     */
    deserializeObject: (objString) => objString !== null ? JSON.parse(objString) : null,

    /**
     * Serialize an object to a string.
     *
     * @param {Object} obj Object.
     * @return {String} Object as a string.
     */
    serializeObject: (obj) => obj !== null ? JSON.stringify(obj) : null,

    /**
     * Deserialize a Date from a string.
     *
     * @param {String} dateString Date string.
     * @return {Date} Date.
     */
    deserializeDate: (dateString) => dateString !== null ? new Date(dateString) : null,

    /**
     * Serialize a Date to a string.
     *
     * @param {Date} date Date.
     * @return {String} Date as a string.
     */
    serializeDate: (date) => date !== null ? date.toISOString() : null,

    /**
     * Convert a serialized Redis object to an object.
     *
     * @param {String} objString Serialized object.
     * @return {Object} Object.
     */
    objectFromRedis: this.deserializeObject,

    /**
     * Convert an object to a serialized Redis object.
     *
     * @param {Object} object Object.
     * @return {String} Serialized object.
     */
    objectToRedis: this.serializeObject,

    /**
     * Convert a serialized Redis date to a Date.
     *
     * @param {String} date Serialized date.
     * @return {Date} Date.
     */
    dateFromRedis: this.deserializeDate,

    /**
     * Convert a Date to a serialized Redis date.
     *
     * @param {Date} date Date.
     * @return {String} Serialized date.
     */
    dateToRedis: this.serializeDate
};