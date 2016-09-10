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

        // Keep track whether we called back
        var calledBack = false;

        // Determine whether the user has permission to manage this game
        game.hasManagePermission(user, function(err, hasPermission) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            // Make sure the user has permission to manage the game
            if(!hasPermission) {
                next(new Error('You don\'t have permission to create a new team'));
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
