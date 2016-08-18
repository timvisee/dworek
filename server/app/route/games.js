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

var appInfo = require('../../appInfo');
var Core = require('../../Core');
var LayoutRenderer = require('../layout/LayoutRenderer');
var CallbackLatch = require('../util/CallbackLatch');

// Games list index
router.get('/', function(req, res, next) {
    LayoutRenderer.render(req, res, next, 'gamelist', 'Games', {
        games: {
            category: null
        }
    });
});

router.get('/open', function(req, res, next) {
    renderGameList(req, res, next, 0, 'Open', 'Open games');
});

router.get('/active', function(req, res, next) {
    renderGameList(req, res, next, 1, 'Active', 'Active games');
});

router.get('/finished', function(req, res, next) {
    renderGameList(req, res, next, 2, 'Finished', 'Finished games');
});

/**
 * Render a list of games.
 *
 * @param req Express request.
 * @param res Express response.
 * @param next Express next callback.
 * @param {Number} stage Game stage.
 * @param {string} category Game category name.
 * @param {string} pageTitle Page title.
 */
function renderGameList(req, res, next, stage, category, pageTitle) {
    // Create a list of usable game objects to use for rendering
    var gameObjects = [];

    // Create a callback latch to determine whether to start rendering the layout
    var latch = new CallbackLatch();

    // Get the list of active games
    latch.add();
    Core.model.gameModelManager.getGamesWithStage(stage, {
        limit: undefined
    }, function(err, games) {
        // Call back errors
        if(err !== null) {
            next(err);
            return;
        }

        // Fill the list of game objects
        games.forEach(function(game) {
            // Add a callback latch for this entry
            latch.add();

            // Create a dummy game object
            var gameObject = {
                id: game.getIdHex(),
                name: null
            };

            // Get the game name and put it in the object
            game.getName(function(err, name) {
                // Call back errors
                if(err !== null) {
                    next(err);
                    return;
                }

                // Set the name
                gameObject.name = name;

                // Add the game object to the list
                gameObjects.push(gameObject);

                // Resolve the latch
                latch.resolve();
            });
        });

        // Resolve the latch
        latch.resolve();
    });

    // Render the games page
    latch.then(function() {
        LayoutRenderer.render(req, res, next, 'gamelist', pageTitle, {
            games: {
                category: category,
                games: gameObjects
            }
        });
    });
}

module.exports = router;
