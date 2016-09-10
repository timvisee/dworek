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
     * Route the player pages.
     *
     * @param router Express router instance.
     */
    route: (router) => {
        // Store the module instance
        const self = module.exports;

        // Route the pages
        router.get('/:game/players', self.get);

        // Route the list pages
        router.get('/:game/players/requested', (req, res, next) => self.listPage(req, res, next, 'requested'));
        router.get('/:game/players/players', (req, res, next) => self.listPage(req, res, next, 'players'));
        router.get('/:game/players/specials', (req, res, next) => self.listPage(req, res, next, 'specials'));
        router.get('/:game/players/spectators', (req, res, next) => self.listPage(req, res, next, 'spectators'));
    },

    /**
     * Get page.
     *
     * @param req Express request object.
     * @param res Express response object.
     * @param next Express next callback.
     */
    get: (req, res, next) => {
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

        // Create a game object
        var gameObject = {
            users: {
                category: null
            }
        };

        // Create a teams object
        var teamsObject = {
            teams: []
        };

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

        // Get the game users count
        latch.add();
        Core.model.gameUserModelManager.getGameUsersCount(game, function(err, usersCount) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            // Set the property
            gameObject.users.count = usersCount;

            // Resolve the latch
            latch.resolve();
        });

        // Render the page when we're ready
        latch.then(function() {
            // Render the game page if we didn't call back yet
            if(!calledBack)
                LayoutRenderer.render(req, res, next, 'gameplayer', gameObject.name, {
                    page: {
                        leftButton: 'back'
                    },
                    game: gameObject
                });
        });
    },

    /**
     * Render the game user list page.
     *
     * @param req Express request object.
     * @param res Express response object.
     * @param {function} next Express next callback.
     * @param {string} category Game user category.
     */
    listPage: (req, res, next, category) => {
        // Make sure the user is logged in
        if(!req.session.valid) {
            LayoutRenderer.render(req, res, next, 'requirelogin', 'Whoops!');
            return;
        }

        // Get the game and user
        const game = req.game;
        const user = req.session.user;

        // Call back if the game is invalid
        if(game === undefined) {
            next(new Error('Invalid game.'));
            return;
        }

        // Create a callback latch to fetch the user rights
        var latch = new CallbackLatch();

        // Create a game, user and teams object
        var gameObject = {};
        var userObject = {};
        var teamsObject = {
            teams: []
        };

        // Make sure we only call back once
        var calledBack = false;

        // Determine whether the user is game host
        latch.add();
        game.getUser(function(err, host) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            // Make sure the user isn't null
            if(host === null) {
                userObject.isHost = false;
                return;
            }

            // Set whether the user is
            userObject.isHost = host.getId().equals(user.getId());

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
            userObject.isAdmin = isAdmin;

            // Resolve the latch
            latch.resolve();
        });

        // Get the game object
        latch.add();
        getGameUserListObject(game, category, function(err, result) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            // Set the game object
            gameObject = result;

            // Resolve the latch
            latch.resolve();
        });

        // Get the game teams
        latch.add();
        game.getTeams(function(err, teams) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            // Loop through the list of teams
            teams.forEach(function(team) {
                // Cancel the loop if we called back
                if(calledBack)
                    return;

                // Create a team object
                var teamObject = {
                    id: team.getIdHex()
                };

                // Get the team name
                latch.add();
                team.getName(function(err, name) {
                    // Call back errors
                    if(err !== null) {
                        if(!calledBack)
                            next(err);
                        calledBack = true;
                        return;
                    }

                    // Set the name in the team object
                    teamObject.name = name;

                    // Add the team object to the list of teams
                    teamsObject.teams.push(teamObject);

                    // Resolve the latch
                    latch.resolve();
                })
            });

            // Resolve the latch
            latch.resolve();
        });

        // Render the page when everything is fetched successfully
        latch.then(function() {
            // Render the game page if we didn't call back yet
            if(!calledBack)
                LayoutRenderer.render(req, res, next, 'gameplayer', gameObject.name, {
                    page: {
                        leftButton: 'back'
                    },
                    game: gameObject,
                    user: userObject,
                    teams: teamsObject
                });
        });
    }
};
