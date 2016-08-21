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
var CallbackLatch = require('../util/CallbackLatch');
var LayoutRenderer = require('../layout/LayoutRenderer');
var GameParam = require('../router/middleware/GameParam');

// Games overview
router.get('/', function(req, res, next) {
    // Redirect back to the front page
    res.redirect('/');
});

// Attach the game param middleware
GameParam.attach(router);

// Specific game
router.get('/:game', function(req, res, next) {
    // Make sure the user is logged in
    if(!req.session.valid) {
        LayoutRenderer.render(req, res, next, 'requirelogin', 'Whoops!');
        return;
    }

    // Get the game
    const game = req.game;

    // Call back if the game is invalid
    if(game === undefined) {
        next(new Error('Invalid game.'));
        return;
    }

    // Game properties
    var gameName = null;
    var gamePlayerCount = null;
    var gamePlayerQueuedCount = null;

    // Create a callback latch for the games properties
    var latch = new CallbackLatch();

    // Fetch the game name
    latch.add();
    game.getName(function(err, name) {
        // Call back errors
        if(err !== null) {
            next(err);
            return;
        }

        // Set the property
        gameName = name;

        // Resolve the latch
        latch.resolve();
    });

    // Fetch the game players
    latch.add();
    Core.model.gameUserModelManager.getGameUserCount(game, {queued: false}, function(err, count) {
        // Call back errors
        if(err !== null) {
            next(err);
            return;
        }

        // Set the property
        gamePlayerCount = count;

        // Resolve the latch
        latch.resolve();
    });

    // Fetch the game players
    latch.add();
    Core.model.gameUserModelManager.getGameUserCount(game, {queued: true}, function(err, count) {
        // Call back errors
        if(err !== null) {
            next(err);
            return;
        }

        // Set the property
        gamePlayerQueuedCount = count;

        // Resolve the latch
        latch.resolve();
    });

    // Render the page when we're ready
    latch.then(function() {
        // Render the game page
        LayoutRenderer.render(req, res, next, 'game', gameName, {
            game: {
                name: gameName,
                playerCount: gamePlayerCount,
                playerQueuedCount: gamePlayerQueuedCount
            }
        });
    });
});

module.exports = router;
