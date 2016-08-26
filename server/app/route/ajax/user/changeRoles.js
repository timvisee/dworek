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

    // TODO: Make sure the user has rights to change this. (Check whether the user is the game host, or is administrator)

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

    // Create a callback latch for the role changing process
    var latch = new CallbackLatch();

    // Create a variable for the game
    var game = null;

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

        // Determine whether this request is cancelled, due to an error of some sort
        var cancelled = false;

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
                    status: 'ok'
                });
        });
    });
});

// Export the router
module.exports = router;
