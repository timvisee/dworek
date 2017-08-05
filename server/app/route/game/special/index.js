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

var Core = require('../../../../Core');
var LayoutRenderer = require('../../../layout/LayoutRenderer');
var CallbackLatch = require('../../../util/CallbackLatch');

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
        router.get('/:game/special', self.get);
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

        // Get the game and user
        const game = req.game;
        const user = req.session.user;

        // Call back if the game is invalid
        if(game === undefined) {
            next(new Error('Invalid game.'));
            return;
        }

        // Check whether the user has permissions
        module.exports._hasSpecialPermission(game, user, function(err, hasPermission) {
            // Call back errors
            if(err !== null) {
                next(err);
                return;
            }

            // Show an error page if the user doesn't have permission
            if(!hasPermission) {
                LayoutRenderer.render(req, res, next, 'permission/nopermission', 'Whoops!');
                return;
            }

            // Create a game object
            var gameObject = {
                id: game.getIdHex(),
                users: [],
                teams: []
            };

            // Create a callback latch
            var latch = new CallbackLatch();
            var calledBack = false;

            // Get the game players
            latch.add();
            Core.model.gameUserModelManager.getGameUsers(game, {
                players: true
            }, function(err, users) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        next(err);
                    calledBack = true;
                    return;
                }

                // Loop through each user
                latch.add(users.length);
                users.forEach(function(user) {
                    // Create an user object
                    var userObject = {
                        id: user.getIdHex()
                    };

                    // Create a user latch for fetching user data
                    var userLatch = new CallbackLatch();

                    // Get the first name of the user
                    // TODO: Move all these name queries in a single query
                    userLatch.add();
                    user.getFirstName(function(err, firstName) {
                        // Call back errors
                        if(err !== null) {
                            if(!calledBack)
                                next(err);
                            calledBack = true;
                            return;
                        }

                        // Add the name to the user object
                        userObject.firstName = firstName;

                        // Resolve the user latch
                        userLatch.resolve();
                    });

                    // Get the last name of the user
                    userLatch.add();
                    user.getLastName(function(err, lastName) {
                        // Call back errors
                        if(err !== null) {
                            if(!calledBack)
                                next(err);
                            calledBack = true;
                            return;
                        }

                        // Add the name to the user object
                        userObject.lastName = lastName;

                        // Resolve the user latch
                        userLatch.resolve();
                    });

                    // Get the team name of the user
                    userLatch.add();
                    Core.model.gameUserModelManager.getGameUser(game, user, function(err, gameUser) {
                        // Call back errors
                        if(err !== null) {
                            if(!calledBack)
                                next(err);
                            calledBack = true;
                            return;
                        }

                        // Return if no game user was found
                        if(gameUser === undefined || gameUser === null) {
                            userObject.teamName = '?';
                            userLatch.resolve();
                            return;
                        }

                        // Get the team
                        gameUser.getTeam(function(err, team) {
                            // Call back errors
                            if(err !== null) {
                                if(!calledBack)
                                    next(err);
                                calledBack = true;
                                return;
                            }

                            // Return if no team was found
                            if(team === undefined || team === null) {
                                userObject.teamName = '?';
                                userLatch.resolve();
                                return;
                            }

                            // Get the name of the team
                            team.getName(function(err, name) {
                                // Call back errors
                                if(err !== null) {
                                    if(!calledBack)
                                        next(err);
                                    calledBack = true;
                                    return;
                                }

                                // Add the team name to the user object
                                userObject.teamName = name;

                                // Resolve the user latch
                                userLatch.resolve();
                            });
                        });
                    });

                    // Get the avatar URL of the user
                    latch.add();
                    user.getAvatarUrl(function(err, avatarUrl) {
                        // Call back errors
                        if(err !== null) {
                            if(!calledBack)
                                next(err);
                            calledBack = true;
                            return;
                        }

                        // Set the URL
                        userObject.avatarUrl = avatarUrl;

                        // Resolve the latch
                        latch.resolve();
                    });

                    // Put the data in the object when we're done fetching the names
                    userLatch.then(function() {
                        // Put the user object in the game object
                        gameObject.users.push(userObject);

                        // Resolve the latch
                        latch.resolve();
                    });
                });

                // Resolve the latch
                latch.resolve();
            });

            // Get the teams
            latch.add();
            Core.model.gameTeamModelManager.getGameTeams(game, function(err, teams) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        next(err);
                    calledBack = true;
                    return;
                }

                // Loop through each team
                latch.add(teams.length);
                teams.forEach(function(team) {
                    // Create an team object
                    var teamObject = {
                        id: team.getIdHex()
                    };

                    // Create a team latch for fetching team data
                    var teamLatch = new CallbackLatch();

                    // Get the name of the team
                    teamLatch.add();
                    team.getName(function(err, name) {
                        // Call back errors
                        if(err !== null) {
                            if(!calledBack)
                                next(err);
                            calledBack = true;
                            return;
                        }

                        // Add the name to the team object
                        teamObject.name = name;

                        // Resolve the team latch
                        teamLatch.resolve();
                    });

                    // Put the data in the object when we're done fetching the names
                    teamLatch.then(function() {
                        // Put the team object in the game object
                        gameObject.teams.push(teamObject);

                        // Resolve the latch
                        latch.resolve();
                    });
                });

                // Resolve the latch
                latch.resolve();
            });

            // Render the page when we're ready
            latch.then(function() {
                LayoutRenderer.render(req, res, next, 'game/special/index', 'Custom action', {
                    page: {
                        leftButton: 'back'
                    },
                    game: gameObject
                });
            });
        });
    },

    /**
     * Check whether the user has the permissions required to invoke special actions.
     * The user is allowed when he has the special role, or when the user is a game manager.
     *
     * @param {GameModel} game Game model of the game to check the permission for.
     * @param {UserModel} user User model of the user to check the permission for.
     * @param {hasSpecialPermissionCallback} callback Called with the result or when an error occurred.
     */
    _hasSpecialPermission: function(game, user, callback) {
        // Define whether the user has permission, and create a permission latch
        var hasPermission = false;

        // Create a latch
        var latch = new CallbackLatch();
        var calledBack = false;

        // Get the game user
        latch.add();
        Core.model.gameUserModelManager.getGameUser(game, user, function(err, gameUser) {
            // Call back errors
            if(err !== null || gameUser === null || gameUser === undefined) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Make sure the user is a special player (or an administrator)
            gameUser.isSpecial(function(err, isSpecial) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Set the permission flag to true if the user has permission
                if(isSpecial)
                    hasPermission = true;

                // Resolve the permission latch
                latch.resolve();
            });
        });

        // Check whether the user has management permissions for this game
        latch.add();
        game.hasManagePermission(user, function(err, hasManagePermission) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Set the permission flag to true if the user has permission
            if(hasManagePermission)
                hasPermission = true;

            // Resolve the permission latch
            latch.resolve();
        });

        // Call back the result when we're done
        latch.then(function() {
            callback(null, hasPermission);
        });
    }

    /**
     * Called with the result or when an error occurred.
     *
     * @callback hasSpecialPermissionCallback
     * @param {Error|null} Error instance if an error occurred, null otherwise.
     * @param {boolean} [hasPermission] True if the user has permission, false if not.
     */
};
