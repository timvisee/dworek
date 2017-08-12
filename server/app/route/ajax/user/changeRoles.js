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

var _ = require('lodash');
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
    if(!req.hasOwnProperty('body') || !req.body.hasOwnProperty('data')) {
        next(new Error('Missing data'));
        return;
    }

    // Parse the data
    const data = JSON.parse(req.body.data);

    // Get the list of user IDs
    const gameId = data.game;
    const users = data.users;
    const teamValue = _.has(data, 'role.team') && data.role.team !== null ? data.role.team.trim().toLowerCase() : 'none';
    const isSpecial = data.role.special;
    const isSpectator = data.role.spectator;

    // Create a variable for the game
    var game = null;

    // Map with game team IDs and their user counts
    var teamUserCountMap = null;

    // Create a callback latch
    var latch = new CallbackLatch();

    // Get the game instance and make sure the game exists
    latch.add(2);
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

        // Get the teams for this game
        Core.model.gameTeamModelManager.getGameTeamsUserCount(game, function(err, userCountMap) {
            // Call back errors
            if(err !== null) {
                next(err);
                return;
            }

            // Store the count map
            teamUserCountMap = userCountMap;

            // Resolve the latch
            latch.resolve();
        });

        // Resolve the latch
        latch.resolve();
    });

    // Continue when we're done fetching the game
    latch.then(function() {
        // Reset the latch back to it's identity to recycle it
        latch.identity();

        // Make sure we only call back once
        var calledBack = false;

        // Create a flag to store whether the user has permission
        var hasPermission = false;

        // Determine whether the user has permission to manage this game
        latch.add();
        game.hasManagePermission(user, function(err, result) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            // Set the permission flag
            hasPermission = result;

            // Resolve the latch
            latch.resolve();
        });

        // Continue when we're done
        latch.then(function() {
            // Reset the latch back to it's identity
            latch.identity();

            // Make sure the user has rights to manage this game
            if(!hasPermission) {
                next(new Error('You don\'t have permission to change user roles'));
                return;
            }

            // Create an array of players that were successfully updated
            var updatedUsers = [];

            // Loop through the user ids
            users.forEach(function(userId) {
                // Format the user ID
                userId = userId.trim();

                // Cancel the current loop if we called back already
                if(calledBack)
                    return;

                // Get the game user for this game and user
                latch.add();
                Core.model.gameUserModelManager.getGameUser(game, userId, function(err, gameUser) {
                    // Continue if the operation was cancelled
                    if(calledBack)
                        return;

                    // Call back errors
                    if(err !== null) {
                        if(!calledBack)
                            next(err);
                        calledBack = true;
                        return;
                    }

                    // Make sure the game user is valid
                    if(gameUser === null || gameUser === undefined) {
                        // Respond with an error
                        if(!calledBack)
                            res.json({
                                status: 'error',
                                error: {
                                    message: 'Invalid game and user ID combination for user \'' + userId + '\''
                                }
                            });

                        // Set the cancelled flag and return
                        calledBack = true;
                        return;
                    }

                    // Determine the new team value
                    var newTeam;

                    // Pick no team
                    if(teamValue === 'none' || teamValue === '')
                        newTeam = null;

                    // Pick a random team
                    else if(teamValue === 'random') {
                        // Create an array with candidate team IDs
                        var candidateTeams = [];
                        var candidateUserCount = -1;

                        // Loop through the teams in the user count object
                        teamUserCountMap.forEach(function(userCount, teamId) {
                            // Check whether the team count equals the candidate count
                            if(candidateUserCount === userCount) {
                                // Put the team ID in the array
                                candidateTeams.push(teamId);
                                return;
                            }

                            // Set a new user candidate count if the current team has a lower value, or if we didn't have a candidate yet
                            if(candidateUserCount > userCount || candidateUserCount === -1) {
                                // Update the candidate user count
                                candidateUserCount = userCount;

                                // Flush the candidate list and push this team ID in it
                                candidateTeams = [teamId];
                            }
                        });

                        // Select a random team from the candidates, use no team if we don't have any
                        if(candidateTeams.length > 0) {
                            // Determine the new team ID for this user
                            const newTeamId = candidateTeams[Math.floor(Math.random() * candidateTeams.length)];

                            // Increase the user count for this team
                            teamUserCountMap.set(newTeamId, teamUserCountMap.get(newTeamId) + 1);

                            // Set the new team instance
                            newTeam = Core.model.gameTeamModelManager._instanceManager.create(newTeamId);
                        } else
                            newTeam = null;

                    } else {
                        // Make sure the team value exists in the team user count object, set the team to null otherwise
                        if(teamUserCountMap.has(teamValue))
                            // Create a team instance for this, and set the new team
                            newTeam = Core.model.gameTeamModelManager._instanceManager.create(teamValue);
                        else
                            newTeam = null;
                    }

                    // Create a fields object with the new field values
                    const fields = {
                        team: newTeam,
                        is_special: isSpecial,
                        is_spectator: isSpectator
                    };

                    // Set the fields for the game user
                    gameUser.setFields(fields, function(err) {
                        // Call back errors
                        if(err !== null) {
                            if(!calledBack)
                                next(err);
                            calledBack = true;
                            return;
                        }

                        // Add the user to the updated users list
                        updatedUsers.push(userId);

                        // Resolve the latch
                        latch.resolve();
                    });
                });
            });

            // Send the result when we're done
            latch.then(function() {
                // Flush the game user model manager
                Core.model.gameUserModelManager.flushCache(function(err) {
                    // Call back errors
                    if(err !== null) {
                        if(!calledBack)
                            next(err);
                        calledBack = true;
                        return;
                    }

                    // Send an OK response if not cancelled
                    if(!calledBack)
                        res.json({
                            status: 'ok',
                            updatedUsers
                        });

                    // Loop through the user IDs to send them game updates
                    updatedUsers.forEach(function(userId) {
                        // Get the user model
                        Core.model.userManager.getUser(userId, function(err, user) {
                            // Make sure the user model isn't null
                            if(err === null && user === null)
                                err = new Error('User model is null');

                            // Log errors
                            if(err !== null || user === null) {
                                console.error('Failed to send updated game data to all players, unable to get user model for user, ignoring (user id: ' + userId + ')');
                                console.error(err.stack || err);
                                return;
                            }

                            // Send the updated game data to the player
                            Core.gameManager.sendGameData(game, user, function(err) {
                                // Log errors
                                if(err !== null) {
                                    console.error('Failed to send updated game data to a player, ignoring');
                                    console.error(err.stack || err);
                                }
                            });
                        });
                    });
                });
            });
        });
    });
});

// Export the router
module.exports = router;
