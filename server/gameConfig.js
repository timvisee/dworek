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

/**
 * Game configuration.
 * @type {Object}
 */
var gameConfig = {
    /**
     * Game section.
     */
    game: {
        /**
         * Tick interval in milliseconds.
         * @type {Number}
         */
        tickInterval: 5 * 1000
    },

    /**
     * Player configurations.
     */
    player: {
        /**
         * Initial money amount, when a user starts the game.
         */
        initialMoney: 3000,

        /**
         * Initial in.
         */
        initialIn: 0,

        /**
         * Initial out.
         */
        initialOut: 0,

        /**
         * Initial strength the user has.
         */
        initialStrength: 1,

        /**
         * Get the upgrades and their cost.
         *
         * @param {Number} strength Current strength.
         * @return {*[]}
         */
        getStrengthUpgrades: function(strength) {
            // Base price
            const basePrice = 35;
            const power = 1.5;

            // Create an array of defences
            var strengths = [{
                name: 'Pistol',
                cost: Math.round(basePrice * Math.pow(power, strength)),
                strength: 1
            }];

            // Add a second strength when the defence level is 3 or lower
            if(strength < 3) {
                strengths.push({
                    name: 'P90 RUSH B',
                    cost: Math.round((basePrice * 0.8) * Math.pow(power, strength)),
                    strength: 1
                });
            }

            // Add a third strength when the defence level is 3 or higher
            if(strength >= 3) {
                strengths.push({
                    name: 'S.W.A.T. Gun',
                    cost: Math.round((basePrice * 2.1) * Math.pow(power, strength)),
                    strength: 2
                });
            }

            // Add a fourth strength when the defence level is 6 or higher
            if(strength >= 6) {
                strengths.push({
                    name: 'Body Guard',
                    cost: Math.round((basePrice * 4.2) * Math.pow(power, strength)),
                    strength: 4
                });
            }

            // Add a fifth strength when the defence level is 8 or higher
            if(strength >= 8) {
                strengths.push({
                    name: 'RPG-V2',
                    cost: Math.round((basePrice * 8.3) * Math.pow(power, strength)),
                    strength: 8
                });
            }

            // Add a sixth strength when the defence level is 10 or higher
            if(strength >= 10) {
                strengths.push({
                    name: 'Tank',
                    cost: Math.round((basePrice * 18) * Math.pow(power, strength)),
                    strength: 16
                });
            }

            // Return the defences
            return strengths;
        }
    },

    /**
     * Shop configurations.
     */
    shop: {
        /**
         * Operation range in meters.
         * @type {Number}
         */
        range: 15,

        /**
         * Active operation range in meters.
         * This range is effective when a user is inside the shops range.
         * @type {Number}
         */
        activeRange: 20,

        /**
         * Shop worker invocation interval.
         * @type {Number}
         */
        workerInterval: 10 * 1000,

        /**
         * Get the number of preferred shops in a team, based on the team size.
         * @param {Number} playerCount Number of players in the team.
         * @return {Number} Number of preferred shops.
         */
        getShopsInTeam: function(playerCount) {
            // Return zero if there are no players in the team
            if(playerCount <= 0)
                return 0;

            // Determine the preferred number of shops
            return Math.ceil(playerCount / 8)
        },

        /**
         * The lifetime of a shop in milliseconds.
         * Fetched once when a shop is created.
         * @return {Number}
         */
        getShopLifetime: function() {
            // Define the minimum and maximum shop lifetimes
            const timeMin = 8 * 60 * 1000;
            const timeMax = 12 * 60 * 1000;

            // Randomize the shop lifetime
            return Math.round(Math.random() * (timeMax - timeMin) + timeMin);
        },

        /**
         * The time in advance a user gets to know he'll become a shop. This is the time in milliseconds.
         * @type {Number}
         */
        shopAlertTime: 45 * 1000,

        /**
         * Get the price per unit the in goods are sold for.
         * Fetched once when a shop is created.
         * @return {Object} ally key with ally cost, enemy key with enemy cost.
         */
        getInSellPrice: function() {
            // Define the minimum and maximum price
            const priceMin = 7.5;
            const priceMax = 11;
            const allyMultiplier = 1.25;

            // Randomize the price
            const price = Math.random() * (priceMax - priceMin) + priceMin;

            // Return the cost object
            return {
                ally: +((price * allyMultiplier).toFixed(1)),
                enemy: +(price.toFixed(1))
            };
        },

        /**
         * Get the price per unit the out goods are bought for.
         * Fetched once when a shop is created.
         * @return {Object} ally key with ally cost, enemy key with enemy cost.
         */
        getOutBuyPrice: function() {
            // Define the minimum and maximum price
            const priceMin = 39;
            const priceMax = 51;
            const allyMultiplier = 0.7;

            // Randomize the price
            const price = Math.random() * (priceMax - priceMin) + priceMin;

            // Return the cost object
            return {
                ally: +((price * allyMultiplier).toFixed(1)),
                enemy: +(price.toFixed(1))
            };
        },
    },

    /**
     * Factory configurations.
     */
    factory: {
        /**
         * Get the operation range in meters.
         * @param {Number} level Current factory level.
         * @return {Number} Range in meters.
         */
        getRange: function(level) {
            return 8.5 + Math.pow(level - 1, 0.3) * 4;
        },

        /**
         * Minimum amount of space between the centers of two factories in meters.
         * @type {Number}
         */
        interspaceMin: 95,

        /**
         * Get the active operation range in meters.
         * This range is effective when a user is inside the shops range.
         * @param {Number} level Current factory level.
         * @return {Number} Range in meters.
         */
        getActiveRange: function(level) {
            return this.getRange(level) + 5;
        },

        /**
         * Initial factory level, when the factory is created.
         * @type {Number}
         */
        initialLevel: 1,

        /**
         * Initial factory defence value, when the factory is created.
         * @type {Number}
         */
        initialDefence: 7,

        /**
         * Initial in value.
         * @param {Number}
         */
        initialIn: 0,

        /**
         * Initial out value.
         * @param {Number}
         */
        initialOut: 0,

        /**
         * Calculate the production input for each tick.
         * @param {Number} level Factory level.
         * @return {Number} Production input for each tick.
         */
        getProductionIn: function(level) {
            // Constants
            const ratioIn = 3;

            // Calculate and return the production value
            return Math.round(level * ratioIn);
        },

        /**
         * Calculate the production output for each tick.
         * @param {Number} level Factory level.
         * @return {Number} Production output for each tick.
         */
        getProductionOut: function(level) {
            // Constants
            const ratioOut = 1;

            // Calculate and return the production value
            return Math.round(ratioOut + Math.pow(level, 1.3) - 1);
        },

        /**
         * Function to calculate the factory cost.
         *
         * @param {Number} allyFactoryCount Number of factories the team owns.
         * @param {Number} enemyFactoryCount Average number of factories each team owns.
         * @return {Number} Cost of a new factory.
         */
        getBuildCost: function(allyFactoryCount, enemyFactoryCount) {
            // Factory base price
            const FACTORY_BASE_PRICE = 400;

            // Decrease both factory counts by one (to a minimum of 3)
            // This makes the first 3 factories free to build
            allyFactoryCount = Math.max(allyFactoryCount - 2, 0);
            enemyFactoryCount = Math.max(enemyFactoryCount - 2, 0);

            // The first factory costs nothing
            if(allyFactoryCount <= 0)
                return 0;

            // // The second factory costs the initial money value
            // if(allyFactoryCount == 1)
            //     return Math.round(gameConfig.player.initialMoney);

            // Calculate the level offset due to the ally/enemy factory ratio
            const ratioOffset = (allyFactoryCount - enemyFactoryCount) / 4;

            // Calculate the factory cost and return it
            return Math.round(FACTORY_BASE_PRICE * Math.pow(1.4, allyFactoryCount + ratioOffset));
        },

        /**
         * Get the cost to upgrade a level.
         *
         * @param {Number} level Level to get the cost for.
         * @return {Number} Level cost.
         */
        getLevelCost: function(level) {
            // Calculate the level cost
            const levelCost = Math.round(250 + 500 * Math.pow(level - 1, 1.5));

            // Return the level cost if the level is 10 or below
            if(level <= 10)
                return levelCost;

            // Increase the level cost rapidly for higher levels
            return Math.round(levelCost * Math.pow(1.2, level - 10));
        },

        /**
         * Get the upgrades and their cost.
         *
         * @param {Number} defence Current defence.
         * @return {*[]}
         */
        getDefenceUpgrades: function(defence) {
            // Base price
            const basePrice = 100;
            const power = 1.2;

            // Create an array of defences
            var defences = [{
                name: 'Mexicans',
                cost: Math.round(basePrice * Math.pow(power, defence)),
                defence: 1
            }];

            // Add a second defence when the defence level is 6 or higher
            if(defence >= 6) {
                defences.push({
                    name: 'Pitbull',
                    cost: Math.round((basePrice * 2.1) * Math.pow(power, defence)),
                    defence: 2
                });
            }

            // Add a third defence when the defence level is 9 or higher
            if(defence >= 9) {
                defences.push({
                    name: 'AK-47',
                    cost: Math.round((basePrice * 4.2) * Math.pow(power, defence)),
                    defence: 4
                });
            }

            // Add a fourth defence when the defence level is 13 or higher
            if(defence >= 13) {
                defences.push({
                    name: 'Sniper',
                    cost: Math.round((basePrice * 8.3) * Math.pow(power, defence)),
                    defence: 8
                });
            }

            // Add a fifth defence when the defence level is 15 or higher
            if(defence >= 15) {
                defences.push({
                    name: 'Private Army',
                    cost: Math.round((basePrice * 18) * Math.pow(power, defence)),
                    defence: 16
                });
            }

            // Return the defences
            return defences;
        },

        /**
         * Get the new in value when a factory is attacked.
         *
         * @param {Number} oldIn Old in value.
         * @return {Number} New in value.
         */
        attackNewIn: function(oldIn) {
            return Math.round(oldIn * 0.5);
        },

        /**
         * Get the new out value when a factory is attacked.
         *
         * @param {Number} oldOut Old out value.
         * @return {Number} New out value.
         */
        attackNewOut: function(oldOut) {
            return Math.round(oldOut * 0.5);
        },

        /**
         * Get the new defence value when a factory is attacked.
         *
         * @param {Number} oldDefence Old defence value.
         * @return {Number} New defence value.
         */
        attackNewDefence: function(oldDefence) {
            return Math.floor(oldDefence * 0.66);
        }
    },

    /**
     * Ping configurations.
     */
    ping: {
        /**
         * Object defining the configuration of a ping, including it's effect strength and price.
         *
         * @typedef {Object} PingConfig
         * @param {String} name Name of the ping.
         * @param {Number} price Price to use the ping.
         * @param {Number} range Range of the ping in meters, -1 for an infinite range.
         * @param {Number} duration Duration of the ping's effect in seconds.
         * @param {Number} max Maximum number of factories this ping can find, -1 for infinite factories.
         */

        /**
         * Get the pings a user can buy/use.
         *
         * @param teamMoney Money the user's team currently has.
         * @return {[PingConfig]} Array of PingConfig objects, an empty array if the user can't use pings.
         */
        getPings: function(teamMoney) {
            // Minimum possible prices and price factors for the pings
            const CHEAP_RADAR_TEAM_MONEY_THRESHOLD = 500;
            const CHEAP_RADAR_PRICE = 75;
            const RADAR_PRICE_FACTOR = 0.05;
            const RADAR_PRICE_MIN = 500;
            const SATELLITE_PRICE_FACTOR = 0.1;
            const SATELLITE_PRICE_MIN = 1000;
            const ENEMY_HACK_PRICE_FACTOR = 0.2;
            const ENEMY_HACK_PRICE_MIN = 8000;
            const ENEMY_HACK_TEAM_MONEY_THRESHOLD = 40000;

            // Dynamically determine ping IDs, and create an array of pings
            var i = 1;
            var pings = [];

            // Add the cheap radar
            if(teamMoney < CHEAP_RADAR_TEAM_MONEY_THRESHOLD)
                pings.push({
                    id: i++,
                    name: "Cheap Radar",
                    price: CHEAP_RADAR_PRICE,
                    range: 25,
                    duration: 45 * 1000,
                    max: 1
                });

            // Add default pings
            pings.push({
                id: i++,
                name: "Radar",
                price: Math.round(Math.max(teamMoney * RADAR_PRICE_FACTOR, RADAR_PRICE_MIN)),
                range: 40,
                duration: 45 * 1000,
                max: 1
            });
            pings.push({
                id: i++,
                name: "Spy Satellite",
                price: Math.round(Math.max(teamMoney * SATELLITE_PRICE_FACTOR, SATELLITE_PRICE_MIN)),
                range: -1,
                duration: 45 * 1000,
                max: 1
            });

            // Add the expensive enemy hack ping
            if(teamMoney >= ENEMY_HACK_TEAM_MONEY_THRESHOLD)
                pings.push({
                    id: i++,
                    name: "Enemy Hack",
                    price: Math.round(Math.max(teamMoney * ENEMY_HACK_PRICE_FACTOR, ENEMY_HACK_PRICE_MIN)),
                    range: -1,
                    duration: 45 * 1000,
                    max: 2
                });

            // Return the list of pings
            return pings;
        }
    }
};

// Export the game configuration
module.exports = gameConfig;
