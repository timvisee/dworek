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

var mongo = require('mongodb');
var ObjectId = mongo.ObjectId;

var config = require('../../../config');

var Core = require('../../../Core');
var CallbackLatch = require('../../util/CallbackLatch');
var TokenGenerator = require('../../token/TokenGenerator');
var PacketType = require('../../realtime/PacketType');

/**
 * Shop class.
 *
 * @param {User} user Live user this shop is attached to.
 * @param {ShopManager} shopManager Shop manager.
 *
 * @class
 * @constructor
 */
var Shop = function(user, shopManager) {
    /**
     * Shop token.
     * @type {string}
     * @private
     */
    this._token = null;

    /**
     * The live user this shop is attached to.
     * @type {User}
     * @private
     */
    this._user = user;

    /**
     * Shop manager for this shop.
     * @type {ShopManager} Shop manager.
     * @private
     */
    this._shopManager = shopManager;

    /**
     * The price per unit in goods are sold for.
     * @type {Number}
     * @private
     */
    this._inSellPrice = null;

    /**
     * The price per unit the out goods are bought for.
     * @type {Number}
     * @private
     */
    this._outBuyPrice = null;

    /**
     * Shop's effective range.
     * @type {Number}
     * @private
     */
    this._range = null;
};

/**
 * Get the shop token.
 *
 * @return {string} Shop token.
 */
Shop.prototype.getToken = function() {
    return this._token;
};

/**
 * Check whether the given token equals this shop's token.
 *
 * @param {string} token Shop token.
 * @return {boolean} True if this is the shop's token, false if not.
 */
Shop.prototype.isToken = function(token) {
    // Compare the user ID
    return this._token.equals(token.trim().toLowerCase());
};

/**
 * Get the user this shop is attached to.
 *
 * @return {User} User.
 */
Shop.prototype.getUser = function() {
   return this._user;
};

/**
 * Get the shop manager this shop is in.
 *
 * @return {ShopManager} Shop manager.
 */
Shop.prototype.getShopManager = function() {
    return this._shopManager;
};

/**
 * Get the game this shop is located in.
 *
 * @return {Game} Game.
 */
Shop.prototype.getGame = function() {
    return this.getShopManager().game;
};

/**
 * Get the location of the shop.
 *
 * @return {Coordinate} Shop location.
 */
Shop.prototype.getLocation = function() {
    return this.getUser().getLocation();
};

/**
 * Load the shop.
 *
 * @param callback (err)
 */
Shop.prototype.load = function(callback) {
    // Create a callback latch
    var latch = new CallbackLatch();

    // Make sure we only call back once
    var calledBack = false;

    // Store this instance
    const self = this;

    // Generate a shop token
    latch.add();
    TokenGenerator.generateToken(32, function(err, token) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the token
        self._token = token;

        // Resolve the latch
        latch.resolve();
    });

    // Get the game's configuration
    latch.add();
    this.getGame().getConfig(function(err, gameConfig) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Determine the buy and sell prices
        self._inSellPrice = gameConfig.shop.getInSellPrice();
        self._outBuyPrice = gameConfig.shop.getOutBuyPrice();

        // Determine the effective range
        self._range = gameConfig.shop.range;

        // Determine the lifetime and alert time of this shop
        const lifeTime = gameConfig.shop.getShopLifetime();
        const alertTime = gameConfig.shop.shopAlertTime;

        // Set the lifetime timer
        setTimeout(function() {
            // Remove the shop from the list
            self.getShopManager().shops.splice(self.getShopManager().shops.indexOf(self), 1);

            // Send a notification to the current shop user
            Core.realTime.packetProcessor.sendPacketUser(PacketType.MESSAGE_RESPONSE, {
                message: 'Your shop has been transferred',
                error: false,
                toast: true,
                dialog: false
            }, self.getUser().getUserModel());
        }, lifeTime);

        // Set the alert timer
        setTimeout(function() {
            // Return if the team model is invalid
            if(self.getUser().getTeamModel() == null)
                return;

            // Find a replacement user
            var newUser = self.getShopManager().findNewShopUser(self.getUser().getTeamModel().getId().toString());

            // Return if we don't have a new user
            if(newser == null)
                return;

            // Schedule the new user
            self.getShopManager().scheduleUser(newUser);

            // Send a notification to the current shop user
            Core.realTime.packetProcessor.sendPacketUser(PacketType.MESSAGE_RESPONSE, {
                message: 'Your shop will be transferred to another player shortly',
                error: false,
                toast: true,
                dialog: false
            }, self.getUser().getUserModel());

        }, lifeTime - alertTime);

        // Resolve the latch
        latch.resolve();
    });

    // Call back when we're done
    latch.then(() => callback(null));
};

/**
 * Get the in goods sell price.
 * @return {Number}
 */
Shop.prototype.getInSellPrice = function() {
    return this._inSellPrice;
};

/**
 * Get the out goods buy price.
 * @return {Number}
 */
Shop.prototype.getOutBuyPrice = function() {
    return this._outBuyPrice;
};

/**
 * Get the effective range of this shop.
 * @return {Number} Effective range in meters.
 */
Shop.prototype.getRange = function() {
    return this._range;
};

/**
 * Check whether the given location is in the shop's range.
 *
 * @param {Coordinate} location Other location.
 * @return {boolean} True if the shop is in range, false if not.
 */
Shop.prototype.isLocactionInRange = function(location) {
    // Get the distance, compare it to the range and return the result
    return this.getLocation().getDistanceTo(location) <= this.getRange();
};

/**
 * Check whether the given live user is in range of the shop.
 *
 * @param {User} user The live user to check for.
 * @return {boolean} True if the user is in range, false if not.
 */
Shop.prototype.isUserInRange = function(user) {
    // Make sure the user has a recent location
    if(!user.hasRecentLocation())
        return false;

    // Get the user location and check whether the user is in range
    this.isLocactionInRange(user.getLocation());
};

// Export the class
module.exports = Shop;

