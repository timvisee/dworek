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

var Core = require('../../../Core');
var LayoutRenderer = require('../../layout/LayoutRenderer');
var CallbackLatch = require('../../util/CallbackLatch');

// Export the module
module.exports = {

    /**
     * Route the team pages.
     *
     * @param router Express router instance.
     */
    route: (router) => {
        // Store the module instance
        const self = module.exports;

        // Route the pages
        router.get('/:game/teams', self.get);
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
        const user = req.session.user;

        // Call back if the game is invalid
        if(game === undefined) {
            next(new Error('Invalid game.'));
            return;
        }

        // Create a game object
        var gameObject = {
            id: game.getIdHex()
        };

        // Create a callback latch for the games properties
        var latch = new CallbackLatch();

        // Create an user object
        var userObject = {};

        // Keep track whether we called back
        var calledBack = false;

        // Get the game name
        var gameName = '';
        latch.add();
        game.getName(function(err, name) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            // Set the game name
            gameName = name;

            // Resolve the latch
            latch.resolve();
        });

        // Check whether the user is administrator
        latch.add();
        user.isAdmin(function(err, result) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            // Make sure the user isn't null
            if(result === null) {
                userObject.isAdmin = false;
                return;
            }

            // Set whether the user is admin
            userObject.isAdmin = result;

            // Resolve the latch
            latch.resolve();
        });

        // Check whether the user has permission to manage this game
        latch.add();
        game.hasManagePermission(user, function(err, result) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            // Set the result
            userObject.hasPermission = result;

            // Resolve the latch
            latch.resolve();
        });

        // Create a teams object
        var teams = [];

        // Get the teams for this game
        latch.add();
        Core.model.gameTeamModelManager.getGameTeams(game, function(err, result) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            // Loop through the list of teams
            latch.add(result.length);
            result.forEach(function(team) {
                // Create a team object to add to the array
                var teamObject = {
                    id: team.getIdHex(),
                    name: ''
                };

                // Get the team name
                team.getName(function(err, name) {
                    // Call back errors
                    if(err !== null) {
                        if(!calledBack)
                            next(err);
                        calledBack = true;
                        return;
                    }

                    // Set the team name
                    teamObject.name = name;

                    // Add the team
                    teams.push(teamObject);

                    // Resolve the latch
                    latch.resolve();
                });
            });

            // Resolve the latch
            latch.resolve();
        });

        // Continue when we're done fetching the users permissions
        latch.then(function() {
            // Cancel if we already called back
            if(calledBack)
                return;

            // Render the game page
            LayoutRenderer.render(req, res, next, 'game/team/index', gameName, {
                page: {
                    leftButton: 'back'
                },
                user: userObject,
                game: gameObject,
                teams: {
                    teams: teams
                }
            });
        });
    }
};
