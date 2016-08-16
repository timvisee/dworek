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

var express = require('express');
var router = express.Router();

var Core = require('../../Core');
var LayoutRenderer = require('../layout/LayoutRenderer');

// Games overview
router.get('/', function(req, res, next) {
    // Redirect back to the front page
    res.redirect('/');
});

// Specific game
router.get('/:gameId', function(req, res, next) {
    // Get the game ID
    var gameId = req.params.gameId;

    // Validate the game ID
    Core.model.gameModelManager.getGameById(gameId, function(err, game) {
        // Call back errors
        if(err !== null) {
            next(err);
            return;
        }

        // Call back an error if the game ID is invalid
        if(game === null) {
            next(new Error('Invalid game ID.'));
            return;
        }

        // Fetch the game name
        game.getName(function(err, gameName) {
            // Call back errors
            if(err !== null) {
                next(err);
                return;
            }

            // Render the game page
            LayoutRenderer.render(req, res, next, 'game', gameName, {
                game: {
                    name: gameName
                }
            });
        });
    });
});

module.exports = router;
