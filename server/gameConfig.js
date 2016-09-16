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
     * Player configurations.
     */
    player: {
        /**
         * Initial money amount, when a user starts the game.
         */
        initialMoney: 500
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
         * Range in meters.
         * @param {Number}
         */
        range: 8,

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
            return 10;
        },

        /**
         * Calculate the production output for each tick.
         * @param {Number} level Factory level.
         * @return {Number} Production output for each tick.
         */
        getProductionOut: function(level) {
            return 15;
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
            return 10;
        },

        /**
         * Get the upgrades and their cost.
         *
         * @param {Number} defence Current defence.
         * @return {*[]}
         */
        getDefenceUpgrades: function(defence) {
            return [
                {
                    name: 'Mexicans',
                    cost: 1,
                    defence: 1
                },
                {
                    name: 'Wall',
                    cost: Math.round(5 + defence * 1.2),
                    defence: 10
                },
                {
                    name: 'Alarm',
                    cost: Math.round(15 + defence * 2),
                    defence: defence * 2
                }
            ];
        }
    }
};

// Export the game configuration
module.exports = gameConfig;
