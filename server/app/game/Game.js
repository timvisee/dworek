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
 * Game class.
 *
 * @class
 * @constructor
 *
 * @param {GameModel} gameModel Model of the game.
 */
var Game = function(gameModel) {
    // Set the game model
    this.model = gameModel;
};

/**
 * Get the game model.
 *
 * @return {GameModel} Game model.
 */
Game.prototype.getModel = function() {
    return this.model;
};

/**
 * Get the game name.
 *
 * @param {Game~getNameCallback} callback Callback with the result.
 */
// TODO: Is this getter ever used?
Game.prototype.getName = function(callback) {
    this.model.getName(callback);
};

/**
 * @callback Game~getNameCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {string} Game name.
 */

// Export the class
module.exports = Game;