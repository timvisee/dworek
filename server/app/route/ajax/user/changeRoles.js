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

var Core = require('../../../../Core');
var CallbackLatch = require('../../../util/CallbackLatch');

// Index page
router.post('/', function(req, res, next) {
    // Make sure the user has a valid session
    if(!req.session.valid) {
        next(new Error('No permission.'));
        return;
    }

    // Get the current user
    const user = req.session.user;

    // Make sure a data object is given
    if(!req.body.hasOwnProperty('data')) {
        next(new Error('Missing data'));
        return;
    }

    // Parse the data
    const data = JSON.parse(req.body.data);

    // Get the list of user IDs
    const gameId = data.game;
    const users = data.users;
    const teamValue = data.role.team;
    const isSpecial = data.role.special;
    const isSpectator = data.role.spectator;

    // Create a variable for the game
    var game = null;

    // Create a callback latch
    var latch = new CallbackLatch();

    // Get the
    latch.add();
    Core.model.gameModelManager.getGameById(gameId, function(err, result) {
        // Call back errors
        if(err !== null) {
            next(err);
            return;
        }

        // Set the game variable
        game = result;

        // Send an error response if the game is null
        if(game === null || game === undefined) {
            res.json({
                status: 'error',
                error: {
                    message: 'Invalid game ID'
                }
            });
            return;
        }

        // Resolve the latch
        latch.resolve();
    });

    // Continue when we're done fetching the game
    latch.then(function() {
        // Reset the latch back to it's identity to recycle it
        latch.identity();

        // Create flags to define whether the user is admin or host of the game
        var admin = false;
        var host = false;

        // Check whether the user is administrator
        latch.add();
        user.isAdmin(function(err, isAdmin) {
            // Call back errors
            if(err !== null) {
                next(err);
                return;
            }

            // Set the admin flag
            admin = isAdmin;

            // Resolve the latch
            latch.resolve();
        });

        // Check whether the user is host of the game
        latch.add();
        game.getUser(function(err, gameHost) {
            // Call back errors
            if(err != null) {
                next(err);
                return;
            }

            // Make sure the host user isn't null
            if(gameHost === null) {
                host = false;
                return;
            }

            // Determine whether the user is host, and set the flag
            host = gameHost.getId().equals(user.getId());
        });

        // Continue when we're done
        latch.then(function() {
            // Reset the latch back to it's identity
            latch.identity();

            // Make sure the user is host or administrator
            if(!host && !admin) {
                next(new Error('You don\'t have permission to change user roles'));
                return;
            }

            // Determine whether this request is cancelled, due to an error of some sort
            var cancelled = false;

            // Create an array of players that were successfully updated
            var updatedUsers = [];

            // Loop through the user ids
            users.forEach(function(userId) {
                // Format the user ID
                userId = userId.trim();

                // Cancel
                if(cancelled)
                    return;

                // Get the game user for this game and user
                latch.add();
                Core.model.gameUserModelManager.getGameUser(game, userId, function(err, gameUser) {
                    // Call back errors
                    if(err !== null) {
                        if(!cancelled)
                            next(err);
                        cancelled = true;
                        return;
                    }

                    // Make sure the game user is valid
                    if(gameUser === null || gameUser === undefined) {
                        // Respond with an error
                        if(!cancelled)
                            res.json({
                                status: 'error',
                                error: {
                                    message: 'Invalid game and user ID combination for user \'' + userId + '\''
                                }
                            });

                        // Set the cancelled flag and return
                        cancelled = true;
                        return;
                    }

                    // Determine the new team value
                    var newTeam;

                    // Set the new team value to none
                    if(teamValue === 'none' || teamValue === '')
                        newTeam = null;

                    else
                    // TODO: Determine the new team value (random, and team IDs)
                        newTeam = null;

                    // Create a fields object with the new field values
                    const fields = {
                        team: newTeam,
                        is_special: isSpecial,
                        is_spectator: isSpectator
                    };

                    // Set the users special state
                    latch.add();
                    gameUser.setFields(fields, function(err) {
                        // Call back errors
                        if(err !== null) {
                            if(!cancelled)
                                next(err);
                            cancelled = true;
                            return;
                        }

                        // Add the user to the updated users list
                        updatedUsers.push(userId);

                        // Resolve the latch
                        latch.resolve();
                    });

                    // Resolve the latch
                    latch.resolve();
                });
            });

            // Send the result when we're done
            latch.then(function() {
                // Send an OK response if not cancelled
                if(!cancelled)
                    res.json({
                        status: 'ok',
                        updatedUsers
                    });
            });
        });
    });
});

// Export the router
module.exports = router;
