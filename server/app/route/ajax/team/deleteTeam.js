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
    const teamIds = data.teams;

    // Create a variable for the game
    var game = null;

    // Create a callback latch
    var latch = new CallbackLatch();

    // Get the game instance and make sure the game exists
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

    // Make sure we only call back once
    var calledBack = false;

    // Continue when we're done fetching the game
    latch.then(function() {
        // Reset the latch back to it's identity to recycle it
        latch.identity();

        // Determine whether the user has permission to manage this game
        game.hasManagePermission(user, function(err, hasPermission) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            // Make sure the user has permission to manage this game
            if(!hasPermission) {
                next(new Error('You don\'t have permission to delete a team'));
                return;
            }

            // Create an array of teams that were successfully deleted
            var deletedTeams = [];

            // Loop through the team ids
            latch.add(teamIds.length);
            teamIds.forEach(function(teamId) {
                // Format the team ID
                teamId = teamId.trim();

                // Cancel the current loop if we called back already
                if(calledBack)
                    return;

                // Get the team instance
                Core.model.gameTeamModelManager.getTeamById(teamId, function(err, team) {
                    // Call back errors
                    if(err !== null) {
                        if(!calledBack)
                            next(err);
                        calledBack = true;
                        return;
                    }

                    // Delete the team
                    team.delete(function(err) {
                        // Call back errors
                        if(err !== null) {
                            if(!calledBack)
                                next(err);
                            calledBack = true;
                            return;
                        }

                        // Add the team ID to the list of deleted teams
                        deletedTeams.push(teamId);

                        // Resolve the latch
                        latch.resolve();
                    });
                });
            });

            // Send the result when we're done
            latch.then(function() {
                // Send an OK response if not cancelled
                if(!calledBack)
                    res.json({
                        status: 'ok',
                        deletedTeams
                    });
            });
        });
    });
});

// Export the router
module.exports = router;
