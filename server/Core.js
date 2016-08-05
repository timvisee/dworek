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

var GameController = require('./app/game/GameController');

/**
 * Core class.
 *
 * @class
 * @constructor
 */
var Core = function() {};

/**
 * Define whether the core is initialized.
 *
 * @private
 * @type {boolean}
 */
Core._init = false;

/**
 * Initialize the Core.
 */
Core.init = function() {
    // Initialize the game controller
    Core.gameController = Object.create(GameController);

    // Load all active games
    Core.gameController.loadActiveGames();

    // Set the initialization status
    Core._init = true;
};

/**
 * Check whether the core is initialized.
 *
 * @return {boolean} True if initialized, false if not.
 */
Core.isInit = function() {
    return Core._init;
};

/**
 * Game controller instance.
 *
 * @type {GameController|null} Game controller instance, or null if the core hasn't been initialized.
 */
Core.gameController = null;

// Export the class
module.exports = Core;