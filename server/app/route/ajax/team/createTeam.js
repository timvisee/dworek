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
var Validator = require('../../../validator/Validator');
var GameTeamDatabase = require('../../../model/gameteam/GameTeamDatabase');

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

    // Get the game ID and new team name
    const gameId = data.game;
    var teamName = data.teamName;

    // Validate the team name
    if(!Validator.isValidTeamName(teamName)) {
        // Show a proper error
        res.json({
            status: 'error',
            error: {
                message: 'Invalid team name.'
            }
        });
        return;
    }

    // Create a variable for the game
    var game = null;

    // Create a callback latch
    var latch = new CallbackLatch();

    // Get the game model instance and make sure it's valid
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
        var isAdmin = false;
        var isHost = false;

        // Keep track whether we called back
        var calledBack = false;

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

            // Set the admin flag
            isAdmin = result;

            // Resolve the latch
            latch.resolve();
        });

        // Check whether the user is host of the game
        latch.add();
        game.getUser(function(err, result) {
            // Call back errors
            if(err != null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            // Make sure the host user isn't null
            if(result === null) {
                isHost = false;
                return;
            }

            // Determine whether the user is host, and set the flag
            isHost = result.getId().equals(user.getId());

            // Resolve the host
            latch.resolve();
        });

        // Continue when we're done
        latch.then(function() {
            // Make sure the user is host or administrator
            if(!isHost && !isAdmin) {
                next(new Error('You don\'t have permission to change user roles'));
                return;
            }

            // Format the team name
            teamName = Validator.formatTeamName(teamName);

            // Create the team with the given name
            GameTeamDatabase.addGameTeam(game, teamName, function(err, gameTeam) {
                // Call back errors
                if(err !== null) {
                    next(err);
                    return;
                }

                // Make sure the team isn't null
                if(gameTeam === null) {
                    next(new Error('Failed to create game team'));
                    return;
                }

                // Send an OK response
                res.json({
                    status: 'ok',
                    team: gameTeam.getIdHex()
                });
            });
        });
    });
});

// Export the router
module.exports = router;
