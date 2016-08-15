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
var UserDatabase = require('../model/user/UserDatabase');
var CallbackLatch = require('../util/CallbackLatch');

// Register index
router.get('/', function(req, res, next) {
    res.render('register', {
        title: 'Register'
    });
});

// Register index
router.post('/', function(req, res, next) {
    // Get the registration field values
    var mail = req.body.mail;
    var password = req.body.password;
    var passwordVerify = req.body.password_verify;
    var firstName = req.body.first_name;
    var lastName = req.body.last_name;

    // Validate mail address
    if(!Validator.isValidMail(mail)) {
        // Show a warning if the user hadn't filled in their mail address
        if(mail.length === 0) {
            // Show an error page
            res.render('error', {
                title: 'Whoops!',
                message: 'Your mail address is missing.\nPlease go back and fill in your mail address.'
            });
            return;
        }

        // Show an error page
        res.render('error', {
            title: 'Whoops!',
            message: 'The mail address you\'ve entered doesn\'t seem to be valid.\n' +
            'Please go back and check your mail address.'
        });
        return;
    }

    // Compare passwords
    if(password !== passwordVerify) {
        // Show an error page
        res.render('error', {
            title: 'Whoops!',
            message: 'The passwords you\'ve entered do not equal.\nPlease go back and check both passwords.'
        });
        return;
    }

    // Validate password
    if(!Validator.isValidPassword(password)) {
        // Show a warning if the user hadn't filled in their password
        if(password.length === 0) {
            // Show an error page
            res.render('error', {
                title: 'Whoops!',
                message: 'Your password is missing.\nPlease go back and fill in your password.'
            });
            return;
        }

        // Get the minimum and maximum password length
        const min = config.validation.passwordMinLength;
        const max = config.validation.passwordMaxLength;

        // Show an error page
        res.render('error', {
            title: 'Whoops!',
            message: 'The password you\'ve entered doesn\'t meet our requirements.\n' +
            'Your password must be between ' + min + ' and ' + max + ' characters long.\n' +
            'Please go back and choose a different password.'
        });
        return;
    }

    // Validate first name
    if(!Validator.isValidFirstName(firstName)) {
        // Show a warning if the user hadn't filled in their first name
        if(firstName.length === 0) {
            // Show an error page
            res.render('error', {
                title: 'Whoops!',
                message: 'Your first name is missing.\nPlease go back and fill in your first name.'
            });
            return;
        }

        // Show an error page
        res.render('error', {
            title: 'Whoops!',
            message: 'The first name you\'ve entered doesn\'t seem to be valid.\n' +
            'Please go back and enter your real first name.'
        });
        return;
    }

    // Validate last name
    if(!Validator.isValidLastName(lastName)) {
        // Show a warning if the user hadn't filled in their password
        if(lastName.length === 0) {
            // Show an error page
            res.render('error', {
                title: 'Whoops!',
                message: 'Your last name is missing.\nPlease go back and fill in your last name.'
            });
            return;
        }

        // Show an error page
        res.render('error', {
            title: 'Whoops!',
            message: 'The last name you\'ve entered doesn\'t seem to be valid.\n' +
            'Please go back and enter your real last name.'
        });
        return;
    }

    // Make sure the mail address of the user isn't already used
    Core.model.userModelManager.isUserWithMail(mail, function(err, result) {
        // Call back errors
        if(err !== null) {
            next(err);
            return;
        }

        // Show an error page if the mail address is already used
        if(result) {
            res.render('error', {
                title: 'Whoops!',
                message: 'It looks like you\'ve already registered with this mail address.\n' +
                'Please go to the login page to login.',
                hideBackButton: true,
                showLoginButton: true
            });
            return;
        }

        // Register the user
        UserDatabase.addUser(mail, password, firstName, lastName, function(err, user) {
            // Call back errors
            if(err !== null) {
                next(err);
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
                    maxAge: config.session.expire
                });

                // Show registration success page
                res.render('register', {
                    title: 'Success',
                    message: 'Welcome ' + firstName + '!\n\n' +
                    'You\'ve successfully been registered.\n' +
                    'Please click the button below to continue to your dashboard.',
                    hideBackButton: true,
                    success: true
                });
            });
        });
    });
});

module.exports = router;
