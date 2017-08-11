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
     * The price per unit in goods are sold for, for ally and enemy players.
     * @type {ShopPriceObject}
     * @private
     */
    this._inSellPrice= null;

    /**
     * The price per unit the out goods are bought for, for ally and enemy players.
     * @type {ShopPriceObject}
     * @private
     */
    this._outBuyPrice = null;

    /**
     * Object defining the cost for ally and enemy players.
     *
     * @typedef {Object} ShopPriceObject
     * @param {Number} ally Cost for ally players.
     * @param {Number} enemy Cost for enemy players.
     */

    /**
     * Shop's effective range.
     * @type {Number}
     * @private
     */
    // TODO: Is this still used? Remove it if not.
    this._range = null;

    /**
     * Array containing live users this shop is in range for.
     *
     * @type {Array} Array of live user objects.
     * @private
     */
    this._userRangeMem = [];
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

    // Get the live game
    const liveGame = this.getGame();

    // Get the game's configuration
    latch.add();
    liveGame.getConfig(function(err, gameConfig) {
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
        const alertTime = Math.min(gameConfig.shop.shopAlertTime, lifeTime);

        // Show a console message
        console.log('Player became a shop (user id: ' + self.getUser().getIdHex() + ', for: ' + lifeTime + 'ms)');

        // Function to actually transfer the shop
        const functionTransfer = function() {
            // Remove the shop from the list
            self.getShopManager().shops.splice(self.getShopManager().shops.indexOf(self), 1);

            // Show a console message
            console.log('Player is no longer a shop (user id: ' + self.getUser().getIdHex() + ')');

            // Send a notification to the current shop user
            Core.realTime.packetProcessor.sendPacketUser(PacketType.MESSAGE_RESPONSE, {
                message: 'You\'re no longer a ' + liveGame.__('shop.name'),
                error: false,
                toast: true,
                dialog: false
            }, self.getUser().getUserModel());

            // Send the game data to the user
            Core.gameManager.sendGameData(self.getGame().getGameModel(), self.getUser().getUserModel(), undefined, function(err) {
                // Handle errors
                if(err !== null) {
                    console.error('Failed to send game data to user, ignoring');
                    console.error(err.stack || err);
                }
            });
        };

        // Function to prepare the shop transfer, if there's any applicable user to transfer to
        const functionPrepareTransfer = function() {
            // Get the current user
            const currentLiveUser = self.getUser();
            const currentUserModel = currentLiveUser.getUserModel();

            // Get the user's team
            currentLiveUser.getTeam(function(err, team) {
                // Handle errors
                if(err !== null) {
                    console.error('Failed to find new shop user, failed to fetch user\'s team');
                    console.error(err.stack || err);
                    return;
                }

                // Return if the team is null
                if(team === null) {
                    console.error('Failed to find new shop user, user\'s team is null');
                    return;
                }

                // Find a replacement user
                self.getShopManager().findNewShopUser(team.getId().toString(), function(err, newUser) {
                    // Handle errors
                    if(err !== null) {
                        console.error('Failed to find new shop user');
                        console.error(err.stack || err);
                        return;
                    }

                    // Get the preferred shop count delta
                    self.getShopManager().getTeamPreferredShopCountDelta(team, function(err, delta) {
                        // Handle errors
                        if(err !== null) {
                            console.error('Failed to determine whether to find a new shop.');
                            console.error(err.stack || err);
                            return;
                        }

                        // Reschedule the shop transfer if no new user was found and the delta is not below zero
                        if(newUser === null && delta >= 0) {
                            setTimeout(functionPrepareTransfer, gameConfig.shop.workerInterval);
                            return;
                        }

                        // Schedule the shop transfer (also for the new user)
                        if(newUser !== null)
                            self.getShopManager().scheduleUser(newUser);
                        setTimeout(functionTransfer, alertTime);

                        // Determine what message to show to the current shop owner
                        var message = 'Your ' + liveGame.__('shop.name') + ' ability will be given to another player soon...';
                        if(newUser === null)
                            message = 'You will lose your ' + liveGame.__('shop.name') + ' ability soon...';

                        // Send a notification to the current shop user
                        Core.realTime.packetProcessor.sendPacketUser(PacketType.MESSAGE_RESPONSE, {
                            message,
                            error: false,
                            toast: true,
                            dialog: false
                        }, currentUserModel);
                    });
                });
            });
        };

        // Set a timer to prepare the shop transfer
        setTimeout(functionPrepareTransfer, lifeTime - alertTime);

        // Resolve the latch
        latch.resolve();
    });

    // Call back when we're done
    latch.then(() => callback(null));
};

/**
 * Get the team this shop is part of.
 *
 * @param {Shop~getTeamCallback} callback Called with the team or when an error occurred.
 */
Shop.prototype.getTeam = function(callback) {
    this.getUser().getTeam(callback);
};

/**
 * Called with the team or when an error occurred.
 *
 * @callback Shop~getTeamCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {GameTeamModel|null=} Game team model instance of the shop's user, or null.
 */

/**
 * Get the in goods sell price.
 * @return {ShopCostObject}
 */
Shop.prototype.getInSellPriceObject = function() {
    return this._inSellPrice;
};

/**
 * Get the in goods sell price.
 * @param {boolean} ally True if the user is an ally of this shop, false if not.
 * @return {Number}
 */
Shop.prototype.getInSellPrice = function(ally) {
    return this.getInSellPriceObject()[ally ? 'ally' : 'enemy'];
};

/**
 * Get the in goods sell price for the given game user.
 * @param {GameUserModel} otherGameUser The game user to get the price for.
 * @param {Shop~getInSellPriceForGameUserCallback} callback Called with the result or when an error occurred.
 */
Shop.prototype.getInSellPriceForGameUser = function(otherGameUser, callback) {
    // Keep a reference to self
    const self = this;

    // Check whether the game user is ally with the shop
    self.isAllyWith(otherGameUser, function(err, isAlly) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Get and call back the price
        callback(null, self.getInSellPrice(isAlly));
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback Shop~getInSellPriceForGameUserCallback
 * @param {Error|null} Error instance if an error occurred, null if not.
 * @param {Number} The price for this user.
 */

/**
 * Get the in goods sell price for the given user.
 * @param {GameModel|Game|ObjectId|string} game The game the user is in.
 * @param {UserModel|User|ObjectId|string} user The user to get the price for.
 * @param {Shop~getInSellPriceForUserCallback} callback Called with the result or when an error occurred.
 */
Shop.prototype.getInSellPriceForUser = function(game, user, callback) {
    // Keep a reference to this
    const self = this;

    // Get the game user
    Core.model.gameUserModelManager.getGameUser(game, user, function(err, gameUser) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // If the game user is null, return false
        if(gameUser === undefined || gameUser === null) {
            callback(null, false);
            return;
        }

        // Get the price for this game user
        self.getInSellPriceForGameUser(gameUser, callback);
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback Shop~getInSellPriceForUserCallback
 * @param {Error|null} Error instance if an error occurred, null if not.
 * @param {Number} The price for this user.
 */

/**
 * Get the out goods buy price.
 * @return {ShopCostObject}
 */
Shop.prototype.getOutBuyPriceObject = function() {
    return this._outBuyPrice;
};

/**
 * Get the out goods buy price.
 * @param {boolean} ally True if the user is an ally of this shop, false if not.
 * @return {Number}
 */
Shop.prototype.getOutBuyPrice = function(ally) {
    return this.getOutBuyPriceObject()[ally ? 'ally' : 'enemy'];
};

/**
 * Get the in goods buy price for the given game user.
 * @param {GameUserModel} otherGameUser The game user to get the price for.
 * @param {Shop~getOutBuyPriceForGameUserCallback} callback Called with the result or when an error occurred.
 */
Shop.prototype.getOutBuyPriceForGameUser = function(otherGameUser, callback) {
    // Keep a reference to self
    const self = this;

    // Check whether the game user is ally with the shop
    self.isAllyWith(otherGameUser, function(err, isAlly) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Get and call back the price
        callback(null, self.getOutBuyPrice(isAlly));
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback Shop~getOutBuyPriceForGameUserCallback
 * @param {Error|null} Error instance if an error occurred, null if not.
 * @param {Number} The price for this user.
 */

/**
 * Get the out goods sell price for the given user.
 * @param {GameModel|Game|ObjectId|string} game The game the user is in.
 * @param {UserModel|User|ObjectId|string} user The user to get the price for.
 * @param {Shop~getOutBuyPriceForUserCallback} callback Called with the result or when an error occurred.
 */
Shop.prototype.getOutBuyPriceForUser = function(game, user, callback) {
    // Keep a reference to this
    const self = this;

    // Get the game user
    Core.model.gameUserModelManager.getGameUser(game, user, function(err, gameUser) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // If the game user is null, return false
        if(gameUser === undefined || gameUser === null) {
            callback(null, false);
            return;
        }

        // Get the price for this game user
        self.getOutBuyPriceForGameUser(gameUser, callback);
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback Shop~getOutBuyPriceForUserCallback
 * @param {Error|null} Error instance if an error occurred, null if not.
 * @param {Number} The price for this user.
 */

/**
 * Check whether this shop is allied with the given game user.
 *
 * @param {GameUserModel} otherGameUser The other game user.
 * @param {Shop~isAllyWithCallback} callback Called with the result or when an error occurred.
 */
Shop.prototype.isAllyWith = function(otherGameUser, callback) {
    // Keep a reference to self
    const self = this;

    // Get the game user for the shop
    this._user.getGameUser(function(err, shopGameUser) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // If the game user is null, return false
        if(otherGameUser === undefined || otherGameUser === null) {
            callback(null, false);
            return;
        }

        // Check whether the game user is ally with the shop
        shopGameUser.isAllyWith(otherGameUser, function(err, isAlly) {
            // Call back errors
            if(err !== null) {
                callback(err);
                return;
            }

            // Get and call back the price
            callback(null, isAlly);
        });
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback Shop~isAllyWithCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean} True if ally, false if not.
 */

/**
 * Get the range of the shop.
 *
 * @param {User|undefined} liveUser Live user instance to get the range for, or undefined to get the global shop range.
 * @param {Shop~getRangeCallback} callback Called back with the range or when an error occurred.
 */
Shop.prototype.getRange = function(liveUser, callback) {
    // Store this instance
    const self = this;

    // Get the game config
    this.getGame().getConfig(function(err, gameConfig) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Check whether the active or global range should be used, call back the result
        if(self.isInRangeMemory(liveUser))
            callback(null, gameConfig.shop.activeRange);
        else
            callback(null, gameConfig.shop.range);
    });
};

/**
 * Called back with the range or when an error occurred.
 *
 * @callback Shop~getRangeCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 * @param {Number=} Shop range in meters.
 */

/**
 * Update the visibility state for the given user.
 *
 * @param {User} liveUser User to update the visibility state for.
 * @param {Shop~updateVisibilityStateCallback} callback Called with the result or when an error occurred.
 */
Shop.prototype.updateVisibilityState = function(liveUser, callback) {
    // Store this instance
    const self = this;

    // Call back if the user is null
    if(liveUser === null) {
        callback(null);
        return;
    }

    // Get the visibility data for the given user
    this.getVisibilityState(liveUser, function(err, visibilityData) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Update the range state, call back the result
        callback(null, self.setInRangeMemory(liveUser, visibilityData.inRange));
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback Shop~updateVisibilityStateCallback
 * @param {Error|null} Error instance if an error occurred.
 * @param {boolean=} True if the state changed, false if not.
 */

/**
 * Check whether the given user is in the range memory.
 *
 * @param {User} liveUser User.
 */
Shop.prototype.isInRangeMemory = function(liveUser) {
    return this._userRangeMem.indexOf(liveUser) >= 0;
};

/**
 * Set whether the given live user is in the range memory of the shop.
 *
 * @param {User} liveUser Live user instance to set the state for.
 * @param {boolean} inRange True to set the in range state to true, false otherwise.
 * @return {boolean} True if the state changed, false if not.
 */
Shop.prototype.setInRangeMemory = function(liveUser, inRange) {
    // Get the memorized range state
    const lastState = this.isInRangeMemory(liveUser);

    // Return false if the state didn't change
    if(lastState === inRange)
        return false;

    // Update the range array
    if(inRange)
        this._userRangeMem.push(liveUser);
    else
        this._userRangeMem.splice(this._userRangeMem.indexOf(liveUser), 1);

    // Return the result
    return true;
};

/**
 * Check whether the given live user is in range of the shop.
 *
 * @param {User} liveUser The live user to check for.
 * @param {Shop~isUserInRangeCallback} callback Called with the result, or when an error occurred.
 */
Shop.prototype.isUserInRange = function(liveUser, callback) {
    // Make sure a valid user is given
    if(liveUser === null) {
        callback(null, false);
        return;
    }

    // Return true if the user is the same as the shop owner
    if(this.getUser().getId().equals(liveUser.getId())) {
        callback(null, true);
        return;
    }

    // Make sure the user has a recent location
    if(!liveUser.hasRecentLocation()) {
        callback(null, false);
        return;
    }

    // Store this instance
    const self = this;

    // Get the shops range
    this.getRange(liveUser, function(err, range) {
        // Call back errors
        if(err !== null) {
            callback(err);
            return;
        }

        // Check whether the user is in range, call back the result
        callback(null, self.getLocation().getDistanceTo(liveUser.getLocation()) <= range);
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback Shop~isUserInRangeCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {boolean=} True if the user is in range, false if not.
 */

/**
 * Get the shop name.
 *
 * @param {Shop~getNameCallback} callback Called with the shop name or when an error occurred.
 */
Shop.prototype.getName = function(callback) {
    // Get the name of the shop user and call it back
    this.getUser().getName(callback);
};

/**
 * Called with the shop name or when an error occurred.
 *
 * @callback Shop~getNameCallback
 * @param {Error|null} Error instance if an error occurred, null on success.
 * @param {string=} Name of the shop.
 */

/**
 * Check whether this shop is visible for the given user.
 *
 * @param {User} liveUser Given user.
 * @param {Shop~getVisibilityStateCallback} callback Called with the result or when an error occurred.
 */
Shop.prototype.getVisibilityState = function(liveUser, callback) {
    // Create a result object
    var resultObject = {
        ally: false,
        visible: false,
        inRange: false
    };

    // Make sure a valid user is given
    if(liveUser === null) {
        callback(null, resultObject);
        return;
    }

    // Get the shop's live user and user model
    const shopLiveUser = this.getUser();
    const shopUserModel = shopLiveUser.getUserModel();

    // Make sure a user model is available
    if(shopUserModel === null) {
        callback(null, resultObject);
        return;
    }

    // Get the user and game model
    const userModel = liveUser.getUserModel();
    const gameModel = this.getGame().getGameModel();

    // Define the current instance
    const self = this;

    // Create a callback latch
    var latch = new CallbackLatch();

    // Create an ally latch
    var allyLatch = new CallbackLatch();

    // Only call back once
    var calledBack = false;

    // Create a variable for the factor and user team
    var shopTeam = null;
    var userTeam = null;

    // Get the shop's team
    allyLatch.add();
    Core.model.gameUserModelManager.getGameUser(shopLiveUser.getGame().getGameModel(), shopUserModel, function(err, shopGameUser) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Resolve the latch if the game user is null
        if(shopGameUser === null) {
            allyLatch.resolve();
            return;
        }

        // Get the user's team
        shopGameUser.getTeam(function(err, result) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Store the shop team
            shopTeam = result;

            // Resolve the latch
            allyLatch.resolve();
        });
    });

    // Get the game user
    latch.add();
    allyLatch.add();
    Core.model.gameUserModelManager.getGameUser(gameModel, userModel, function(err, gameUser) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Resolve the latch if the game user is null
        if(null === gameUser) {
            latch.resolve();
            allyLatch.resolve();
            return;
        }

        // Get the user's team
        gameUser.getTeam(function(err, result) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Set the user
            userTeam = result;

            // Resolve the ally latch
            allyLatch.resolve();
        });

        // Resolve the latch
        latch.resolve();
    });

    // Get the user state
    latch.add();
    gameModel.getUserState(userModel, function(err, userState) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Set the visibility state if the user is a player or spectator
        if(userState.player || userState.spectator)
            resultObject.visible = true;

        // Determine whether the factory is ally when we fetched the team data
        latch.add();
        allyLatch.then(function() {
            // Make sure the user is a player
            if(!userState.player) {
                latch.resolve();
                return;
            }

            // Set the ally status if the teams equal and aren't null
            if(null !== shopTeam && null !== userTeam && shopTeam.getId().equals(userTeam.getId()))
                resultObject.ally = true;

            // Resolve the latch
            latch.resolve();
        });

        // If the user is a player or special player, check whether he's in range
        // Make sure the user has a recently known location
        if((userState.player || userState.special) && liveUser.hasRecentLocation()) {
            // Get the shop range
            latch.add();
            self.isUserInRange(liveUser, function(err, result) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Set whether the user is in range
                resultObject.inRange = result;

                // Resolve the latch
                latch.resolve();
            });
        }

        // Resolve the latch
        latch.resolve();
    });

    // Call back the result object when we're done
    latch.then(function() {
        // Call back the results
        callback(null, resultObject);
    });
};

/**
 * Called with the result or when an error occurred.
 *
 * @callback Shop~getVisibilityStateCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {VisibilityStateObject=} Object with the result.
 */

/**
 * @typedef {Object} VisibilityStateObject
 * @param {boolean} visible True if the shop is visible for the user, false if not.
 * @param {boolean} inRange True if the shop is in the user's range, false if not.
 */

// Export the class
module.exports = Shop;

