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
var _ = require("lodash");

var ajax = require('./ajax/index');
var login = require('./account/login');
var logout = require('./account/logout');
var register = require('./account/register');
var games = require('./games');
var game = require('./game/index');
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
        // Define the page variables object
        var pageVars = {};

        // Set the next property if known
        if(_.isString(req.param('next')))
            pageVars.next = req.param('next');

        // Render the index page
        LayoutRenderer.render(req, res, next, 'index', appInfo.APP_NAME, pageVars);
        return;
    }

    // Get the user of the current session
    const user = req.session.user;

    // Create a callback latch
    var latch = new CallbackLatch();
    var calledBack = false;

    // Create an object with layout options
    var options = {
        games: {
            games: {
                open: [],
                active: []
            }
        },
        user: {
            isAdmin: false
        }
    };

    // Count the games
    latch.add(2);
    getGameList(0, 3, function(err, games) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                next(err);
            calledBack = true;
        } else
            options.games.games.open = games;

        // Resolve the latch
        latch.resolve();
    });
    getGameList(1, 3, function(err, games) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                next(err);
            calledBack = true;
        } else
            options.games.games.active = games;

        // Resolve the latch
        latch.resolve();
    });

    // Determine whether the user is administrator
    latch.add();
    user.isAdmin(function(err, isAdmin) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                next(err);
            calledBack = true;
            return;
        }

        // Set whether the user is administrator
        options.user.isAdmin = isAdmin;

        // Resolve the latch
        latch.resolve();
    });

    // Render the games page
    latch.then(function() {
        LayoutRenderer.render(req, res, next, 'dashboard', appInfo.APP_NAME, options);
    });
});

// Ajax requests
router.use('/ajax', ajax);

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
    var calledBack = false;

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

            // Create a callback latch that is used to fetch game data
            var gameDataLatch = new CallbackLatch();

            // Get the game name and put it in the object
            gameDataLatch.add();
            game.getName(function(err, name) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Set the name
                gameObject.name = name;

                // Resolve the latch
                gameDataLatch.resolve();
            });

            // Get the player count for this game
            gameDataLatch.add();
            Core.model.gameUserModelManager.getGameUserCount(game, function(err, count) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Set the user count
                gameObject.userCount = count;

                // Resolve the latch
                gameDataLatch.resolve();
            });

            // Push the object in the game objects array when we're done
            gameDataLatch.then(function() {
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
        if(!calledBack)
            callback(null, gameObjects);
    });
}

// Export the router
module.exports = router;
