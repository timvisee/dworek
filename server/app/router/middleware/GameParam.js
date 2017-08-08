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

var config = require('../../../config');
var Core = require('../../../Core');
var UserModel = require('../../model/user/UserModel');

/**
 * GameParam middleware class.
 *
 * @class
 * @constructor
 */
var GameParam = function() {};

/**
 * Attach the middleware.
 *
 * @param router Express app router.
 */
GameParam.attach = function(router) {
    // Game parameter parsing middleware
    router.param('game', function(req, res, next, game) {
        // Get the game ID
        var gameId = req.params.game;

        // Validate the game ID
        Core.model.gameModelManager.getGameById(gameId, function(err, game) {
            // Call back errors
            if(err !== null) {
                next(err);
                return;
            }

            // Set the game in the request object if it isn't null
            if(game !== null)
                req.game = game;
            else
                req.game = undefined;

            // Move to the next
            next();
        });
    });
};

// Export the class
module.exports = GameParam;