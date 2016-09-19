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
        tickInterval: 10
    },

    /**
     * Player configurations.
     */
    player: {
        /**
         * Initial money amount, when a user starts the game.
         */
        initialMoney: 500,

        /**
         * Get the upgrades and their cost.
         *
         * @param {Number} strength Current strength.
         * @return {*[]}
         */
        getStrengthUpgrades: function(strength) {
            // Create an array of defences
            var strengths = [{
                name: 'Energy',
                cost: 1,
                strength: 1
            }];

            // Add other defences when the defence is greater than the initial value
            if(strength > 5) {
                strengths.push({
                    name: 'Pistol',
                    cost: Math.round(5 + strength * 1.2),
                    strength: 10
                });
                strengths.push({
                    name: 'Rush B',
                    cost: Math.round(15 + strength * 2),
                    strength: strength * 2
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
         * Shop worker invocation interval.
         * @type {Number}
         */
        workerInterval: 5 * 1000,

        /**
         * Get the number of preferred shops in a team, based on the team size.
         * @param {Number} playerCount Number of players in the team.
         * @return {Number} Number of preferred shops.
         */
        getShopsInTeam: function(playerCount) {
            // Return zero if there are no players in the team
            if(playerCount == 0)
                return 0;

            // Determine the preferred number of shops
            return Math.ceil(playerCount / 15)
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
            return Math.random() * (timeMax - timeMin) + timeMin;
        },

        /**
         * The time in advance a user gets to know he'll become a shop. This is the time in milliseconds.
         * @type {Number}
         */
        shopAlertTime: 45 * 1000,

        /**
         * Get the price per unit the in goods are sold for.
         * Fetched once when a shop is created.
         * @type {Number}
         */
        getInSellPrice: function() {
            // Define the minimum and maximum price
            const priceMin = 5;
            const priceMax = 8;

            // Randomize the price
            return +((Math.random() * (priceMax - priceMin) + priceMin).toFixed(1));
        },

        /**
         * Get the price per unit the out goods are bought for.
         * Fetched once when a shop is created.
         * @type {Number}
         */
        getOutBuyPrice: function() {
            // Define the minimum and maximum price
            const priceMin = 10;
            const priceMax = 14;

            // Randomize the price
            return +((Math.random() * (priceMax - priceMin) + priceMin).toFixed(1));
        },
    },

    /**
     * Factory configurations.
     */
    factory: {
        /**
         * Factory name.
         * @type {String}
         */
        name: 'Lab',

        /**
         * Operation range in meters.
         * @param {Number}
         */
        range: 15,

        /**
         * Initial factory level, when the factory is created.
         * @type {Number}
         */
        initialLevel: 1,

        /**
         * Initial factory defence value, when the factory is created.
         * @type {Number}
         */
        initialDefence: 10,

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
            return 3 * level;
        },

        /**
         * Calculate the production output for each tick.
         * @param {Number} level Factory level.
         * @return {Number} Production output for each tick.
         */
        getProductionOut: function(level) {
            return 2 * level;
        },

        /**
         * Function to calculate the factory cost.
         */
        getCost: function() {
            return 100;
        },

        /**
         * Get the cost to upgrade a level.
         *
         * @param {Number} level Level to get the cost for.
         * @return {Number} Level cost.
         */
        getLevelCost: function(level) {
            return ((level * 0.5) * level) * 10;
        },

        /**
         * Get the upgrades and their cost.
         *
         * @param {Number} defence Current defence.
         * @return {*[]}
         */
        getDefenceUpgrades: function(defence) {
            // Create an array of defences
            var defences = [{
                name: 'Mexicans',
                cost: 1,
                defence: 1
            }];

            // Add other defences when the defence is greater than the initial value
            if(defence > this.initialDefence) {
                defences.push({
                    name: 'Corrupt Agent',
                    cost: Math.round(5 + defence * 1.2),
                    defence: 10
                });
                defences.push({
                    name: 'AK-47',
                    cost: Math.round(15 + defence * 2),
                    defence: defence * 2
                });
            }

            // Return the defences
            return defences;
        }
    }
};

// Export the game configuration
module.exports = gameConfig;
