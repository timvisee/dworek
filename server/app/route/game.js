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

var crypto = require('crypto');
var express = require('express');
var router = express.Router();

var config = require('../../config');

var Core = require('../../Core');
var CallbackLatch = require('../util/CallbackLatch');
var LayoutRenderer = require('../layout/LayoutRenderer');
var GameParam = require('../router/middleware/GameParam');
var Validator = require('../validator/Validator');
var GameUserDatabase = require('../model/gameuser/GameUserDatabase');
var GameTeamDatabase = require('../model/gameteam/GameTeamDatabase');

// Games overview
router.get('/', function(req, res) {
    // Redirect back to the front page
    res.redirect('/');
});

// Attach the game param middleware
GameParam.attach(router);

// Game page
router.get('/:game', function(req, res, next) {
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

    // Create a game and user object
    var gameObject = {};
    var userObject = {};

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
        gameObject.usersCount = usersCount;

        // Resolve the latch
        latch.resolve();
    });

    // Fetch the user state for this game
    latch.add();
    game.getUserState(user, function(err, userState) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                next(err);
            calledBack = true;
            return;
        }

        // Set the property
        gameObject.userState = userState;

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
        gameObject.teamCount = teamCount;

        // Resolve the latch
        latch.resolve();
    });

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

    // Render the page when we're ready
    latch.then(function() {
        // Render the game page
        //noinspection JSCheckFunctionSignatures
        LayoutRenderer.render(req, res, next, 'game', gameObject.name, {
            game: gameObject,
            user: userObject
        });
    });
});

// Game join page
router.get('/:game/join', function(req, res, next) {
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

    // Make sure we only call back once
    var calledBack = false;

    // Get the user's state for this game
    game.getUserState(user, function(err, userState) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                next(err);
            calledBack = true;
            return;
        }

        // Make sure the user hasn't requested already
        if(userState.requested) {
            // Show an error page
            LayoutRenderer.render(req, res, next, 'error', 'Already requested', {
                message: 'It looks like you\'ve already requested to join this game.\n\n' +
                'Please wait for the host of the game to accept your request.'
            });
            return;
        }

        // Make sure the user hasn't joined already
        if(userState.player || userState.special || userState.special) {
            // Show an error page
            LayoutRenderer.render(req, res, next, 'error', 'Already joined', {
                message: 'It looks like you\'ve already joined this game.'
            });
            return;
        }

        // Create a callback latch
        var latch = new CallbackLatch();

        // Create a flag that defines whether the user has a nickname
        var hasNickname = false;

        // Determine whether the user has a nickname
        latch.add();
        GameUserDatabase.addGameUserRequest(game, user, function(err, gameUser) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            // Resolve the latch
            latch.resolve();
        });

        // Check whether the user has a nickname configured
        latch.add();
        user.hasNickname(function(err, result) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            // Store the result and resolve the latch
            hasNickname = result;
            latch.resolve();
        });

        // Render the page when we're done
        latch.then(function() {
            // Render the game page
            LayoutRenderer.render(req, res, next, 'gamejoin', 'Requested', {
                page: {
                    leftButton: 'none',
                    rightButton: 'none'
                },
                user: {
                    hasNickname
                }
            });
        });
    });
});

// Game join post page
router.post('/:game/join', function(req, res, next) {
    // Get the nickname field
    var nickname = req.body['field-nickname'];

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

    // Validate mail address
    if(nickname === undefined) {
        // Show an error page
        LayoutRenderer.render(req, res, next, 'error', 'Whoops!', {
            message: 'An error occurred while setting your nick name.\n\n' +
            'Please go back and try it again.'
        });
        return;
    }

    // Validate nickname
    if(!Validator.isValidNickname(nickname)) {
        // Show an error page
        LayoutRenderer.render(req, res, next, 'error', 'Whoops!', {
            message: 'The nickname you\'ve entered isn\'t valid.\n\n' +
            'Nicknames must be between ' + config.validation.nicknameMinLength +
            ' and ' + config.validation.nicknameMaxLength + ' characters long. The field may be left blank if you ' +
            'don\'t prefer a nickname.\n\n' +
            'Please go back and enter a new nickname.',
            page: {
                leftButton: 'back'
            }
        });
        return;
    }

    // Format the nickname
    nickname = Validator.formatNickname(nickname);

    // Set the users nickname
    req.session.user.setNickname(nickname, function(err) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                next(err);
            calledBack = true;
            return;
        }

        // Redirect to the game's page
        // TODO: Properly format the URL
        res.redirect(req.originalUrl.replace('join', ''));
    });
});

// Game info page
router.get('/:game/info', function(req, res, next) {
    // Make sure the user is logged in
    if(!req.session.valid) {
        LayoutRenderer.render(req, res, next, 'requirelogin', 'Whoops!');
        return;
    }

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
            LayoutRenderer.render(req, res, next, 'gameinfo', gameObject.name, {
                page: {
                    leftButton: 'back'
                },
                game: gameObject
            });
    });
});

// Game info page
router.get('/:game/players', function(req, res, next) {
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
});

// Game user list pages
router.get('/:game/players/requested', (req, res, next) => renderGameUserListPage(req, res, next, 'requested'));
router.get('/:game/players/players', (req, res, next) => renderGameUserListPage(req, res, next, 'players'));
router.get('/:game/players/specials', (req, res, next) => renderGameUserListPage(req, res, next, 'specials'));
router.get('/:game/players/spectators', (req, res, next) => renderGameUserListPage(req, res, next, 'spectators'));

/**
 * Render the game user list page.
 *
 * @param req Express request object.
 * @param res Express response object.
 * @param {function} next Express next callback.
 * @param {string} category Game user category.
 */
function renderGameUserListPage(req, res, next, category) {
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

/**
 * Create the game object for a game user list page.
 *
 * @param {GameModel} game Game model object.
 * @param {string} category Player category.
 * @param {getGameUserListObjectCallback} callback Called with the game object or when an error occurred.
 */
function getGameUserListObject(game, category, callback) {
    // Create a game object
    var gameObject = {
        id: game.getIdHex(),
        users: {
            category: category
        }
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
                callback(err);
            calledBack = true;
            return;
        }

        // Set the property
        gameObject.name = name;

        // Resolve the latch
        latch.resolve();
    });

    // Create the query options object based on the category
    var options = {};
    if(category === 'requested')
        options.requested = true;
    else if(category === 'players')
        options.players = true;
    else if(category === 'specials')
        options.specials = true;
    else if(category === 'spectators')
        options.spectators = true;

    // Get the users in this category
    latch.add();
    Core.model.gameUserModelManager.getGameUsers(game, options, function(err, users) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                callback(err);
            calledBack = true;
            return;
        }

        // Create an users array in the users object
        gameObject.users.users = [];

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
                        callback(err);
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
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Add the name to the user object
                userObject.lastName = lastName;

                // Resolve the user latch
                userLatch.resolve();
            });

            // Get the avatar URL of the user
            latch.add();
            user.getMail(function(err, mail) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Create an MD5 of the mail address
                var mailHash = crypto.createHash('md5').update(mail).digest('hex');

                // Set the mail address, and define the avatar URL
                userObject.avatarUrl = 'https://www.gravatar.com/avatar/' + mailHash + '?s=64&d=mm';

                // Resolve the latch
                latch.resolve();
            });

            // Put the data in the object when we're done fetching the names
            userLatch.then(function() {
                // Put the user object in the game object
                gameObject.users.users.push(userObject);

                // Resolve the latch
                latch.resolve();
            });
        });

        // Resolve the latch
        latch.resolve();
    });

    // Call back with the game object
    latch.then(function() {
        if(!calledBack)
            callback(null, gameObject);
    });
}

/**
 * Called with the game object or when an error occurred.
 *
 * @callback getGameUserListObjectCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {Object=} Game object instance.
 */

// Game teams page
router.get('/:game/teams', function(req, res, next) {
    // Make sure the user is logged in
    if(!req.session.valid) {
        LayoutRenderer.render(req, res, next, 'requirelogin', 'Whoops!');
        return;
    }

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

    // Check whether the user is host of the game
    latch.add();
    game.getUser(function(err, result) {
        // Call back errors
        if(err !== null) {
            if(!calledBack)
                next(err);
            calledBack = true;
            return;
        }

        // Make sure the user isn't null
        if(result === null) {
            userObject.isHost = false;
            return;
        }

        // Determine whether the user is host of the game
        userObject.isHost = result.getId().equals(user.getId());

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
        LayoutRenderer.render(req, res, next, 'gameteam', gameName, {
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
});

module.exports = router;
