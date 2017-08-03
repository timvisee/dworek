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

var LayoutRenderer = require('../../layout/LayoutRenderer');
var CallbackLatch = require('../../util/CallbackLatch');

// Export a function to attach the game info page
module.exports = {

    /**
     * Route the info pages.
     *
     * @param router Express router instance.
     */
    route: (router) => {
        // Store the module instance
        const self = module.exports;

        // Route the pages
        router.get('/:game/info', self.get);
    },

    /**
     * Get page.
     *
     * @param req Express request object.
     * @param res Express response object.
     * @param next Express next callback.
     */
    get: (req, res, next) => {
        // Make sure the user has a valid session
        if(!req.requireValidSession())
            return;

        // Get the game
        const game = req.game;

        // Call back if the game is invalid
        if(game === undefined) {
            if(!calledBack)
                next(new Error('Invalid game.'));
            calledBack = true;
            return;
        }

        // Create a game object
        var gameObject = {};

        // Create a callback latch for the games properties
        var latch = new CallbackLatch();

        // Make sure we only call back once
        var calledBack = false;

        // Fetch the game name
        latch.add();
        game.getName(function(err, name) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            // Set the property
            gameObject.name = name;

            // Resolve the latch
            latch.resolve();
        });

        // Fetch the game stage
        latch.add();
        game.getStage(function(err, stage) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            // Set the property
            gameObject.stage = stage;

            // Resolve the latch
            latch.resolve();
        });

        // Fetch the game's users count
        latch.add();
        game.getUsersCount(function(err, usersCount) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            // Set the property
            gameObject.users = {
                usersCount
            };

            // Resolve the latch
            latch.resolve();
        });

        // Count the number of teams for this game
        latch.add();
        game.getTeamCount(function(err, teamCount) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            // Set the number of teams
            gameObject.teams = {
                teamCount
            };

            // Resolve the latch
            latch.resolve();
        });

        // Render the page when we're ready
        latch.then(function() {
            // Render the game page if we didn't call back yet
            if(!calledBack)
                LayoutRenderer.render(req, res, next, 'game/info', gameObject.name, {
                    page: {
                        leftButton: 'back'
                    },
                    game: gameObject
                });
        });
    }
};
