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
var _ = require("lodash");

var config = require('../../config');

var Core = require('../../Core');
var Validator = require('../validator/Validator');
var IpUtils = require('../util/IpUtils');
var LayoutRenderer = require('../layout/LayoutRenderer');
var SessionValidator = require('../router/middleware/SessionValidator');

// Login index
router.get('/', function(req, res, next) {
    // Redirect the user to the front page if already logged in
    if(req.session.valid) {
        res.redirect('/');
        return;
    }

    // Build the page vars
    var pageVars = {
        page: {
            leftButton: 'back'
        }
    };

    // Set the next parameter if there is any
    if(_.isString(req.param('next')))
        pageVars.next = req.param('next');

    // Show the login page
    LayoutRenderer.render(req, res, next, 'login', 'Login', pageVars);
});

// Login index
router.post('/', function(req, res, next) {
    // Get the login field values
    var mail = req.body['field-mail'];
    var password = req.body['field-password'];

    // Validate mail address
    if(!Validator.isValidMail(mail)) {
        // Show a warning if the user hadn't filled in their mail address
        if(mail.length === 0) {
            // Show an error page
            LayoutRenderer.render(req, res, next, 'error', 'Whoops!', {
                message: 'Your mail address is missing.\n\n' +
                'Please go back and fill in your mail address.'
            });
            return;
        }

        // Show an error page
        LayoutRenderer.render(req, res, next, 'error', 'Whoops!', {
            message: 'The mail address you\'ve entered doesn\'t seem to be valid.\n\n' +
            'Please go back and check your mail address.'
        });
        return;
    }

    // Make sure a password is entered
    if(password.length === 0) {
        // Show an error page
        LayoutRenderer.render(req, res, next, 'error', 'Whoops!', {
            message: 'Your password is missing.\n\n' +
            'Please go back and fill in your password.'
        });
        return;
    }

    // Validate the given credentials
    Core.model.userModelManager.getUserByCredentials(mail, password, function(err, user) {
        // Call back errors
        if(err !== null) {
            next(err);
            return;
        }

        // Show an error page if no user was found
        if(user === null) {
            LayoutRenderer.render(req, res, next, 'error', 'Whoops!', {
                message: 'Your mail address and password combination is invalid.\n\n' +
                'Please go back, verify your user credentials, and try to login again.'
            });
            return;
        }

        // Get the IP address of the user
        const ip = IpUtils.getIp(req);

        // Create a session for the user
        Core.model.sessionModelManager.createSession(user, ip, function(err, sessionId, token) {
            // Call back errors
            if(err !== null) {
                next(err);
                return;
            }

            // Put the token in the user's cookie
            res.cookie(config.session.cookieName, token, {
                maxAge: config.session.expire * 1000
            });

            // Update the session validator
            SessionValidator.route(req, res, function(err) {
                if(err !== null && err !== undefined) {
                    next(err);
                    return;
                }

                // TODO: Refresh user's client authentication

                // Redirect the user to the redirection page
                if(req.param('next')) {
                    // Get the redirection URL
                    const redirectionUrl = req.param('next');

                    // Make sure the redirection URL is valid
                    if(Validator.isValidRedirectUrl(redirectionUrl)) {
                        // Redirect the user to the redirection URL
                        res.redirect(redirectionUrl);
                        return;
                    }
                }

                // Redirect the user to the dashboard
                res.redirect('/');
            });
        });
    });
});

module.exports = router;
