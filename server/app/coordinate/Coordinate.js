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

const _ = require('lodash');
const geolib = require('geolib');

/**
 * Coordinate class.
 *
 * @param {Object} raw Raw input object. Must contain latitude and longitude property.
 *
 * @class
 * @constructor
 */
var Coordinate = (raw) => {
    /**
     * Latitude.
     * @type {Number}
     */
    this.latitude = raw.latitude;

    /**
     * Longitude.
     * @type {Number}
     */
    this.longitude  = raw.longitude;
};

/**
 * Parse a raw location.
 *
 * @param {Object} raw Raw location object.
 * @return {Coordinate|null} Coordinate or null if parsing failed.
 */
Coordinate.parse = (raw) => {
    // Make sure the object contains the required properties
    if(!raw.hasOwnProperty('latitude') || !raw.hasOwnProperty('longitude'))
        return null;

    // Make sure both are numbers
    if(!_.isNumber(raw.latitude) || !_.isNumber(raw.longitude))
        return null;

    // Create a coordinate object, and return it
    return new Coordinate(raw);
};

/**
 * Serialize the coordinate to a string.
 *
 * @return {string} Serialized coordinate.
 */
Coordinate.prototype.serialize =
    () => JSON.stringify(this);

/**
 * Deserialize a previously serialized coordinate.
 *
 * @param {string} serialized Serialized coordinate.
 *
 * @return {Coordinate|null} Serialized coordinate, or null on error.
 */
Coordinate.deserialize =
    (serialized) => Coordinate.parse(JSON.parse(serialized));

/**
 * Get the distance to the other given location in meters.
 *
 * @param {Coordinate} other Other location.
 * @return {Number} Distance in meters.
 */
Coordinate.prototype.getDistanceTo =
    (other) => geolib.getDistance(this, other, 1, 2);

/**
 * Check whether the coordinate is in the range of the other given coordinate.
 *
 * @param {Coordinate} other Other location.
 * @param {Number} maxRange Maximum range in meters (inclusive).
 * @return {boolean} True if the other coordinate is in range, false is not.
 */
Coordinate.prototype.isInRange =
    (other, maxRange) => this.getDistanceTo(other) <= maxRange;

// Export the module
module.exports = Coordinate;