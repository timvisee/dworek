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
        router.get('/:game/manage', self.get);
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

        // Render the page when we're ready
        latch.then(function() {
            // Make sure the user has permission to manage the game
            if(!hasPermission) {
                LayoutRenderer.render(req, res, next, 'nopermission', 'Whoops!');
                return;
            }

            // Render the game management page
            LayoutRenderer.render(req, res, next, 'gamemanage', gameObject.name, {
                page: {
                    leftButton: 'back'
                },
                game: gameObject
            });
        });
    }
};
