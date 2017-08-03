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

var LayoutRenderer = require('../../layout/LayoutRenderer');
var CallbackLatch = require('../../util/CallbackLatch');
const Core = require("../../../Core");
const PacketType = require("../../realtime/PacketType");

// Export the module
module.exports = {

    /**
     * Route the management pages.
     *
     * @param router Express router object.
     */
    route: (router) => {
        // Store the module instance
        const self = module.exports;

        // Route the pages
        router.get('/:game/language', self.get);
        router.post('/:game/language', self.post);
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

        // Get the game and user
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

        // Make sure we only call back once
        var calledBack = false;

        // Create a flag to store whether the user has permission to manage this game
        var hasPermission = false;

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

            // Set whether the user has permission
            hasPermission = result;

            // Resolve the latch
            latch.resolve();
        });

        // Get the language object
        var gameLangObject = {};
        latch.add();
        game.getLangObject(function(err, result) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    next(err);
                calledBack = true;
                return;
            }

            gameLangObject = result;

            // Resolve the latch
            latch.resolve();
        });

        // Render the page when we're ready
        latch.then(function() {
            // Make sure the user has permission to manage the game
            if(!hasPermission) {
                LayoutRenderer.render(req, res, next, 'permission/nopermission', 'Whoops!');
                return;
            }

            // Render the game management page
            LayoutRenderer.render(req, res, next, 'game/language', 'Language', {
                page: {
                    leftButton: 'back'
                },
                game: gameObject,
                lang: {
                    getGameValue: function(node) {
                        if(_.has(gameLangObject, node))
                            return _.get(gameLangObject, node);
                        return '';
                    },
                    getGlobalValue: function(node) {
                        // Get the language text, and return it
                        var text = Core.langManager.__(node, {
                            capitalizeFirst: false,
                            encapsulate: false
                        });
                        return text !== undefined ? text : '';
                    }
                }
            });
        });
    },

    /**
     * Post page.
     *
     * @param req Express request object.
     * @param res Express response object.
     * @param next Express next callback.
     */
    post: (req, res, next) => {
        // Make sure the user has a valid session
        if(!req.requireValidSession())
            return;

        // Get the game and user
        const game = req.game;
        const user = req.session.user;

        // Call back if the game is invalid
        if(game === undefined) {
            next(new Error('Invalid game.'));
            return;
        }

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
                LayoutRenderer.render(req, res, next, 'permission/nopermission', 'Whoops!');
                return;
            }

            // Create a list of language nodes to handle
            const langNodes = [
                'currency.name',
                'currency.names',
                'currency.sign',
                'factory.name',
                'factory.names',
                'shop.name',
                'shop.names',
                'in.name',
                'in.names',
                'out.name',
                'out.names',
            ];

            // Create a new game language object
            var gameLangObject = {};

            // Loop through the nodes, and get their values from the POST request
            langNodes.forEach(function(node) {
                // Get the entered value
                var value = req.body['field-' + node.replace('.', '-')];

                // Add the value to the object if it isn't undefined and/or empty
                if(value !== undefined && _.isString(value) && value.length > 0)
                    _.set(gameLangObject, node, value.trim());
            });

            // Reset the object to null if it's still empty
            if(_.isEmpty(gameLangObject))
                gameLangObject = null;

            // Create a callback latch
            var latch = new CallbackLatch();
            var calledBack = false;

            // Update the language
            latch.add();
            game.setLangObject(gameLangObject, function(err) {
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

            // Get the live game
            latch.add();
            Core.gameManager.getGame(game, function(err, liveGame) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        next(err);
                    calledBack = true;
                    return;
                }

                // Update the language object
                liveGame.getGameLangManager().setGameLangObject(gameLangObject);

                // Send a language update to each user
                liveGame.userManager.users.forEach(function(liveUser) {
                    // Send the language update
                    Core.realTime.packetProcessor.sendPacketUser(PacketType.GAME_LANG_OBJECT_UPDATE, {
                        game: game.getIdHex(),
                        langObject: gameLangObject
                    }, liveUser);
                });

                // Resolve the latch
                latch.resolve();
            });

            // Render the game management page
            latch.then(function() {
                // Render the result page
                LayoutRenderer.render(req, res, next, 'game/language', 'Language', {
                    game: {
                        id: game.getIdHex(),
                    },
                    hideBackButton: true,
                    success: true
                });
            });
        });
    }
};
