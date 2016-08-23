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

var config = require('../../config');

var Core = require('../../Core');
var CallbackLatch = require('../util/CallbackLatch');
var LayoutRenderer = require('../layout/LayoutRenderer');
var GameParam = require('../router/middleware/GameParam');
var Validator = require('../validator/Validator');

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

    // Get the game
    const game = req.game;

    // Call back if the game is invalid
    if(game === undefined) {
        next(new Error('Invalid game.'));
        return;
    }

    // Create a game object
    var gameObject = {};

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
        gameObject.name = name;

        // Resolve the latch
        latch.resolve();
    });

    // Fetch the game's users count
    latch.add();
    game.getUsersCount(function(err, usersCount) {
        // Call back errors
        if(err !== null) {
            next(err);
            return;
        }

        // Set the property
        gameObject.usersCount = usersCount;

        // Resolve the latch
        latch.resolve();
    });

    // Fetch the user state for this game
    latch.add();
    game.getUserState(req.session.user, function(err, userState) {
        // Call back errors
        if(err !== null) {
            next(err);
            return;
        }

        // Set the property
        gameObject.userState = userState;

        // Resolve the latch
        latch.resolve();
    });

    // Render the page when we're ready
    latch.then(function() {
        // Render the game page
        //noinspection JSCheckFunctionSignatures
        LayoutRenderer.render(req, res, next, 'game', gameObject.name, {
            game: gameObject
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

    // Get the user's state for this game
    game.getUserState(user, function(err, userState) {
        // Call back errors
        if(err !== null) {
            next(err);
            return;
        }

        // Make sure the user hasn't requested already
        if(userState.requested) {
            // Show an error page
            LayoutRenderer.render(req, res, next, 'error', 'Already requested', {
                message: 'It looks like you\'ve already requested to join this game.'
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
        Core.model.gameUserModelManager.addGameUserRequest(game, user, function(err, gameUser) {
            // Call back errors
            if(err !== null) {
                next(err);
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
                next(err);
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
            next(err);
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
        next(new Error('Invalid game.'));
        return;
    }

    // Create a game object
    var gameObject = {};

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
        gameObject.name = name;

        // Resolve the latch
        latch.resolve();
    });

    // Fetch the game's users count
    latch.add();
    game.getUsersCount(function(err, usersCount) {
        // Call back errors
        if(err !== null) {
            next(err);
            return;
        }

        // Set the property
        gameObject.usersCount = usersCount;

        // Resolve the latch
        latch.resolve();
    });

    // Render the page when we're ready
    latch.then(function() {
        // Render the game page
        LayoutRenderer.render(req, res, next, 'gameinfo', gameObject.name + ' info', {
            page: {
                leftButton: 'back'
            },
            game: gameObject
        });
    });
});

module.exports = router;
