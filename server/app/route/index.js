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

var login = require('./login');
var logout = require('./logout');
var register = require('./register');
var games = require('./games')
var game = require('./game');
var about = require('./about');
var status = require('./status');

var appInfo = require('../../appInfo');
var Core = require('../../Core');
var CallbackLatch = require('../util/CallbackLatch');
var LayoutRenderer = require('../layout/LayoutRenderer');

// Index page
router.get('/', function(req, res, next) {
    // Show the index page if the user isn't logged in, show the dashboard if logged in
    if(!req.session.valid) {
        LayoutRenderer.render(req, res, next, 'index', appInfo.APP_NAME);
        return;
    }

    // Create a callback latch
    var latch = new CallbackLatch();

    // Create an object with layout options
    var options = {
        games: {
            games: {
                open: [],
                active: []
            }
        }
    };

    // Count the games
    latch.add();
    latch.add();
    getGameList(0, 3, function(err, games) {
        // Call back errors
        if(err !== null)
            next(err);
        else
            options.games.games.open = games;

        // Resolve the latch
        latch.resolve();
    });
    getGameList(1, 3, function(err, games) {
        // Call back errors
        if(err !== null)
            next(err);
        else
            options.games.games.active = games;

        // Resolve the latch
        latch.resolve();
    });

    // Render the games page
    latch.then(function() {
        LayoutRenderer.render(req, res, next, 'dashboard', appInfo.APP_NAME, options);
    });
});

// Login page
router.use('/login', login);

// Logout page
router.use('/logout', logout);

// Register page
router.use('/register', register);

// Games page
router.use('/games', games);

// Game page
router.use('/game', game);

// About page
router.use('/about', about);

// Status page
router.use('/status', status);

/**
 * Get the game list.
 *
 * @param {Number} stage Game stage.
 * @param {Number|undefined} limit Limit of games to fetch, undefined to fetch all.
 * @param {function} callback Callback(err, games)
 */
function getGameList(stage, limit, callback) {
    // Create a list of usable game objects to use for rendering
    var gameObjects = [];

    // Create a callback latch to determine whether to start rendering the layout
    var latch = new CallbackLatch();

    // Get the list of active games
    latch.add();
    Core.model.gameModelManager.getGamesWithStage(stage, {
        limit
    }, function(err, games) {
        // Call back errors
        if(err !== null) {
            callback(err);
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
                    callback(err);
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

    // Call back the list
    latch.then(function() {
        callback(null, gameObjects);
    });
}

module.exports = router;
