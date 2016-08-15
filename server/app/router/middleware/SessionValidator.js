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
var UserModel = require('../../model/user/UserModel');

/**
 * SessionValidator middleware class.
 *
 * @class
 * @constructor
 */
var SessionValidator = function() {};

/**
 * Middleware route.
 *
 * @param {*} req Express request.
 * @param {*} res Express response.
 * @param {function} next Next callback.
 */
SessionValidator.route = function(req, res, next) {
    // Create a login object in the request
    req.login = {
        loggedIn: false,
        sessionToken: undefined,
        user: undefined
    };

    // Get the session token
    var sessionToken = req.cookies.session_token;

    // Continue if the session token is undefined
    if(sessionToken === undefined) {
        next();
        return;
    }

    // Validate the session, and get the associated user
    Core.model.sessionModelManager.getSessionUserByTokenIfValid(sessionToken, function(err, user) {
        // Call back errors
        if(err !== null) {
            next(err);
            return;
        }

        // Check whether we're logged in
        var loggedIn = user !== undefined && user !== null && user instanceof UserModel;

        // Continue if we're not logged in (if the session is invalid)
        if(!loggedIn) {
            // TODO: Remove the session cookie from the client
            next();
            return;
        }

        // Set the session token and user
        req.login.loggedIn = loggedIn;
        req.login.sessionToken = sessionToken;
        req.login.user = user;

        // Continue
        next();
    });
};

// Export the class
module.exports = SessionValidator;