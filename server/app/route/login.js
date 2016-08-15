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

var config = require('../../config');

var Core = require('../../Core');
var Validator = require('../validator/Validator');

// Login index
router.get('/', function(req, res, next) {
    // Redirect the user to the front page if already logged in
    if(req.session.valid) {
        res.redirect('/');
        return;
    }

    // Show the login page
    res.render('login', {
        title: 'Login'
    });
});

// Login index
router.post('/', function(req, res, next) {
    // Get the login field values
    var mail = req.body.mail;
    var password = req.body.password;

    // Validate mail address
    if(!Validator.isValidMail(mail)) {
        // Show a warning if the user hadn't filled in their mail address
        if(mail.length === 0) {
            // Show an error page
            res.render('error', {
                title: 'Whoops!',
                message: 'Your mail address is missing.\n\n' +
                'Please go back and fill in your mail address.'
            });
            return;
        }

        // Show an error page
        res.render('error', {
            title: 'Whoops!',
            message: 'The mail address you\'ve entered doesn\'t seem to be valid.\n\n' +
            'Please go back and check your mail address.'
        });
        return;
    }

    // Make sure a password is entered
    if(password.length === 0) {
        // Show an error page
        res.render('error', {
            title: 'Whoops!',
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
            res.render('error', {
                title: 'Whoops!',
                message: 'Your mail address and password combination is invalid.\n\n' +
                    'Please go back, verify your user credentials, and try to login again.'
            });
            return;
        }

        // Get the IP address of the user
        // TODO: Move this utility code somewhere else
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // Create a session for the user
        Core.model.sessionModelManager.createSession(user, ip, function(err, sessionId, token) {
            // Call back errors
            if(err !== null) {
                next(err);
                return;
            }

            // Put the token in the user's cookie
            res.cookie('session_token', token, {
                maxAge: config.session.expire * 1000
            });

            // Redirect the user
            res.redirect('/');
        });
    });
});

module.exports = router;
