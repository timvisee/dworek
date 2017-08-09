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
        router.get('/:game/factory/:factory/destroy/yes', self.get);
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

        // Keep a reference to this
        const self = this;

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
                if(!calledBack) {
                    // Create an error instance, and configure it
                    var err = new Error('This factory does not exist.');
                    err.status = 404;

                    // Call back the error
                    next(err);
                }
                calledBack = true;
                return;
            }

            // Get the factory model
            const factoryModel = Core.model.factoryModelManager._instanceManager.create(factoryId);

            // Get the current factory contents, and the users to give it to
            var contentsIn = 0;
            var contentsOut = 0;

            // Create a content latch
            var contentsLatch = new CallbackLatch();

            // Get the in contents
            contentsLatch.add();
            factoryModel.getIn(function(err, amount) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        next(err);
                    calledBack = true;
                    return;
                }

                // Set the amount
                contentsIn = amount;

                // Resolve the latch
                contentsLatch.resolve();
            });

            // Get the out contents
            contentsLatch.add();
            factoryModel.getOut(function(err, amount) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        next(err);
                    calledBack = true;
                    return;
                }

                // Set the amount
                contentsOut = amount;

                // Resolve the latch
                contentsLatch.resolve();
            });

            // Get the team that owns this factory
            contentsLatch.add();
            factoryModel.getTeam(function(err, team) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        next(err);
                    calledBack = true;
                    return;
                }

                // Get the users in this team
                team.getGameUsers(function(err, gameUsers) {
                    // Call back errors
                    if(err !== null) {
                        if(!calledBack)
                            next(err);
                        calledBack = true;
                        return;
                    }

                    // Count the users
                    const userCount = gameUsers.length;

                    // Create a good spread latch
                    var goodSpreadLatch = new CallbackLatch();

                    // Spread the goods over all team players
                    if(userCount > 0) {
                        // Determine how much to give everyone
                        const partIn = Math.ceil(contentsIn / userCount);
                        const partOut = Math.ceil(contentsOut / userCount);

                        // Loop through the users and give the units
                        gameUsers.forEach(function(gameUser) {
                            // Determine how much to give
                            const giveIn = Math.min(partIn, contentsIn);
                            const giveOut = Math.min(partOut, contentsOut);

                            // Return if both are zero
                            if(giveIn <= 0 && giveOut <= 0)
                                return;

                            // Subtract the values
                            contentsIn -= giveIn;
                            contentsOut -= giveOut;

                            // Add the units to the user
                            if(giveIn > 0) {
                                goodSpreadLatch.add();
                                gameUser.addIn(giveIn, function(err) {
                                    // Call back errors
                                    if(err !== null) {
                                        if(!calledBack)
                                            next(err);
                                        calledBack = true;
                                        return;
                                    }

                                    // Resolve the latch
                                    goodSpreadLatch.resolve();
                                });
                            }

                            // Add the units to the user
                            if(giveOut > 0) {
                                goodSpreadLatch.add();
                                gameUser.addOut(giveOut, function(err) {
                                    // Call back errors
                                    if(err !== null) {
                                        if(!calledBack)
                                            next(err);
                                        calledBack = true;
                                        return;
                                    }

                                    // Resolve the latch
                                    goodSpreadLatch.resolve();
                                });
                            }
                        });
                    }

                    // Resolve the content latch when the transfers are done
                    goodSpreadLatch.then(function() {
                        // Resolve the contents latch
                        contentsLatch.resolve();
                    });
                });
            });

            // We're done with all the transfers
            contentsLatch.then(function() {
                // Get the live factory
                factoryModel.getLiveFactory(function(err, liveFactory) {
                    // Call back errors
                    if (err !== null) {
                        if (!calledBack)
                            next(err);
                        calledBack = true;
                        return;
                    }

                    // Destroy the factory
                    liveFactory.destroy(function() {
                        // Call back errors
                        if(err !== null) {
                            if(!calledBack)
                                next(err);
                            calledBack = true;
                            return;
                        }

                        // Send game data to everyone
                        Core.gameManager.sendGameDataToAll(game, function(err) {
                            // Handle errors
                            if(err !== null) {
                                console.error('An error occurred when broadcasting the game data to everybody');
                                console.error(err);
                            }
                        });

                        // Broadcast the updated location data to all players
                        Core.gameManager.broadcastLocationData(5000, game, undefined, undefined, function(err) {
                            // Handle errors
                            if(err !== null) {
                                console.error('An error occurred when broadcasting the updated location data to everybody');
                                console.error(err);
                            }
                        });

                        // Show a success page
                        LayoutRenderer.render(req, res, next, 'game/factory/destroy', 'Factory destroyed', {
                            page: {
                                leftButton: 'back'
                            },
                            game: {
                                id: game.getIdHex()
                            }
                        });
                    });
                });
            });
        });
    }
};
