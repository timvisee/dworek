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

var pageSpecial = require('./custom');

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
        router.get('/:game/special', self.get);

        // Route the special page
        pageSpecial.route(router);
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

        // Check whether the user has permissions
        module.exports._hasSpecialPermission(game, user, function(err, hasPermission) {
            // Call back errors
            if(err !== null) {
                next(err);
                return;
            }

            // Show an error page if the user doesn't have permission
            if(!hasPermission) {
                LayoutRenderer.render(req, res, next, 'permission/nopermission', 'Whoops!');
                return;
            }

            // Render the page
            LayoutRenderer.render(req, res, next, 'game/special/index', 'Special actions', {
                page: {
                    leftButton: 'back'
                },
                game: {
                    id: game.getIdHex()
                }
            });
        });
    },

    /**
     * Check whether the user has the permissions required to invoke special actions.
     * The user is allowed when he has the special role, or when the user is a game manager.
     *
     * @param {GameModel} game Game model of the game to check the permission for.
     * @param {UserModel} user User model of the user to check the permission for.
     * @param {hasSpecialPermissionCallback} callback Called with the result or when an error occurred.
     */
    _hasSpecialPermission: function(game, user, callback) {
        // Define whether the user has permission, and create a permission latch
        var hasPermission = false;

        // Create a latch
        var latch = new CallbackLatch();
        var calledBack = false;

        // Get the game user
        latch.add();
        Core.model.gameUserModelManager.getGameUser(game, user, function(err, gameUser) {
            // Call back errors
            if(err !== null || gameUser === null || gameUser === undefined) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Make sure the user is a special player (or an administrator)
            gameUser.isSpecial(function(err, isSpecial) {
                // Call back errors
                if(err !== null) {
                    if(!calledBack)
                        callback(err);
                    calledBack = true;
                    return;
                }

                // Set the permission flag to true if the user has permission
                if(isSpecial)
                    hasPermission = true;

                // Resolve the permission latch
                latch.resolve();
            });
        });

        // Check whether the user has management permissions for this game
        latch.add();
        game.hasManagePermission(user, function(err, hasManagePermission) {
            // Call back errors
            if(err !== null) {
                if(!calledBack)
                    callback(err);
                calledBack = true;
                return;
            }

            // Set the permission flag to true if the user has permission
            if(hasManagePermission)
                hasPermission = true;

            // Resolve the permission latch
            latch.resolve();
        });

        // Call back the result when we're done
        latch.then(function() {
            callback(null, hasPermission);
        });
    }

    /**
     * Called with the result or when an error occurred.
     *
     * @callback hasSpecialPermissionCallback
     * @param {Error|null} Error instance if an error occurred, null otherwise.
     * @param {boolean} [hasPermission] True if the user has permission, false if not.
     */
};
