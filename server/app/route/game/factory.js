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
        router.get('/:game/factory', self.getRoot);
        router.get('/:game/factory/:factory', self.get);
    },

    /**
     * Redirect the user back to the game if he's on the factory root directory (without a specified factory).
     *
     * @param req Express request object.
     * @param res Express response object.
     */
    getRoot: (req, res) => {
        // Get the game
        const game = req.game;

        // Redirect the user to the game's page
        res.redirect('/game/' + game.getIdHex());
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

        // Make sure we only call back once
        var calledBack = false;

        // Call back if the game is invalid
        if(game === undefined) {
            if(!calledBack)
                next(new Error('Invalid game.'));
            calledBack = true;
            return;
        }

        // Make sure the game is active
        game.getStage(function(err, stage) {
            // Call back errors
            if(err !== null || stage < 1) {
                if(!calledBack)
                    next(new Error('This page is is not available when the game hasn\'t been started yet.'));
                calledBack = true;
                return;
            }

            // Get the factory ID
            var factoryId = req.params.factory;

            // Make sure the factory ID is valid
            Core.model.factoryModelManager.isValidFactoryId(factoryId, function(err, valid) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        next(err);
                    calledBack = true;
                    return;
                }

                // Make sure the factory is valid
                if(!valid) {
                    if(!calledBack)
                        next(new Error('Invalid factory ID'));
                    calledBack = true;
                    return;
                }

                // Get the factory model
                const factoryModel = Core.model.factoryModelManager._instanceManager.create(factoryId);

                // Make sure the factory is part of this game
                factoryModel.getGame(function(err, result) {
                    // Call back errors
                    if(err !== null) {
                        if(!calledBack)
                            next(err);
                        calledBack = true;
                        return;
                    }

                    // Compare the games
                    if(!game.getId().equals(result.getId())) {
                        if(!calledBack)
                            next(new Error('The factory is not part of this game'));
                        calledBack = true;
                        return;
                    }

                    // Get the live factory
                    factoryModel.getLiveFactory(function(err, liveFactory) {
                        // Call back errors
                        if(err !== null) {
                            if(!calledBack)
                                next(err);
                            calledBack = true;
                            return;
                        }

                        // TODO: Make sure the user has rights to view this factory!

                        // Create a factory object
                        var factoryObject = {
                            id: factoryModel.getIdHex()
                        };

                        // Create a callback latch
                        var latch = new CallbackLatch();

                        // Get the factory name
                        latch.add();
                        factoryModel.getName(function(err, name) {
                            // Call back errors
                            if(err !== null) {
                                if(!calledBack)
                                    next(err);
                                calledBack = true;
                                return;
                            }

                            // Set the name
                            factoryObject.name = name;

                            // Resolve the latch
                            latch.resolve();
                        });

                        // Get the factory level
                        latch.add();
                        factoryModel.getLevel(function(err, level) {
                            // Call back errors
                            if(err !== null) {
                                if(!calledBack)
                                    next(err);
                                calledBack = true;
                                return;
                            }

                            // Set the level
                            factoryObject.level = level;

                            // Resolve the latch
                            latch.resolve();
                        });

                        // Get the defence value
                        latch.add();
                        factoryModel.getDefence(function(err, defence) {
                            // Call back errors
                            if(err !== null) {
                                if(!calledBack)
                                    next(err);
                                calledBack = true;
                                return;
                            }

                            // Set the defence
                            factoryObject.defence = defence;

                            // Resolve the latch
                            latch.resolve();
                        });

                        // Get the input
                        latch.add();
                        factoryModel.getIn(function(err, input) {
                            // Call back errors
                            if(err !== null) {
                                if(!calledBack)
                                    next(err);
                                calledBack = true;
                                return;
                            }

                            // Set the input
                            factoryObject.in = input;

                            // Resolve the latch
                            latch.resolve();
                        });

                        // Get the output
                        latch.add();
                        factoryModel.getOut(function(err, output) {
                            // Call back errors
                            if(err !== null) {
                                if(!calledBack)
                                    next(err);
                                calledBack = true;
                                return;
                            }

                            // Set the defence
                            factoryObject.out = output;

                            // Resolve the latch
                            latch.resolve();
                        });

                        // Get the creator
                        latch.add();
                        factoryModel.getUser(function(err, creator) {
                            // Call back errors
                            if(err !== null) {
                                if(!calledBack)
                                    next(err);
                                calledBack = true;
                                return;
                            }

                            // Get the display name of the user
                            latch.add();
                            creator.getDisplayName(function(err, displayName) {
                                // Call back errors
                                if(err !== null) {
                                    if(!calledBack)
                                        next(err);
                                    calledBack = true;
                                    return;
                                }

                                // Set the display name
                                factoryObject.creatorName = displayName;

                                // Resolve the latch
                                latch.resolve();
                            });

                            // Get the game user
                            latch.add();
                            Core.model.gameUserModelManager.getGameUser(game, creator, function(err, gameUser) {
                                // Call back errors
                                if(err !== null) {
                                    if(!calledBack)
                                        next(err);
                                    calledBack = true;
                                    return;
                                }

                                // Get the team
                                factoryModel.getTeam(function(err, team) {
                                    // Call back errors
                                    if(err !== null) {
                                        if(!calledBack)
                                            next(err);
                                        calledBack = true;
                                        return;
                                    }

                                    // Get the team name
                                    team.getName(function(err, teamName) {
                                        // Call back errors
                                        if(err !== null) {
                                            if(!calledBack)
                                                next(err);
                                            calledBack = true;
                                            return;
                                        }

                                        // Set the team name
                                        factoryObject.teamName = teamName;

                                        // Resolve the latch
                                        latch.resolve();
                                    });
                                });
                            });

                            // Resolve the latch
                            latch.resolve();
                        });

                        // Render the page when we're ready
                        latch.then(function() {
                            // Render the game page if we didn't call back yet
                            if(!calledBack)
                                LayoutRenderer.render(req, res, next, 'factory', factoryObject.name, {
                                    page: {
                                        leftButton: 'back'
                                    },
                                    factory: factoryObject
                                });
                        });
                    });
                })
            });
        });
    }
};
