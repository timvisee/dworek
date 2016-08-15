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
                message: 'Your mail address is missing. Please go back and fill in your mail address.'
            });
            return;
        }

        // Show an error page
        res.render('error', {
            title: 'Whoops!',
            message: 'The mail address you\'ve entered does not seem to be valid. Please go back and check your mail address.'
        });
        return;
    }

    // Compare passwords
    if(password !== passwordVerify) {
        // Show an error page
        res.render('error', {
            title: 'Whoops!',
            message: 'The passwords you\'ve entered do not equal. Please go back and check both passwords.'
        });
        return;
    }

    // Validate password
    if(!Validator.isValidPassword(password)) {
        // Show a warning if the user hadn't filled in their password
        if(mail.length === 0) {
            // Show an error page
            res.render('error', {
                title: 'Whoops!',
                message: 'Your password is missing. Please go back and fill in your password.'
            });
            return;
        }

        // Get the minimum and maximum password length
        const min = config.validation.passwordMinLength;
        const max = config.validation.passwordMaxLength;

        // Show an error page
        res.render('error', {
            title: 'Whoops!',
            message: 'The password you\'ve entered does not meet our requirements.\n' +
            'Your password must be between ' + min + ' and ' + max + ' characters long.\n' +
            'Please go back and choose a different password.'
        });
        return;
    }

    // Validate first name
    if(!Validator.isValidFirstName(firstName)) {
        // Show a warning if the user hadn't filled in their first name
        if(mail.length === 0) {
            // Show an error page
            res.render('error', {
                title: 'Whoops!',
                message: 'Your first name is missing. Please go back and fill in your first name.'
            });
            return;
        }

        // Show an error page
        res.render('error', {
            title: 'Whoops!',
            message: 'The first name you\'ve entered does not seem to be valid. Please go back and enter your real first name.'
        });
        return;
    }

    // Validate last name
    if(!Validator.isValidLastName(lastName)) {
        // Show a warning if the user hadn't filled in their password
        if(mail.length === 0) {
            // Show an error page
            res.render('error', {
                title: 'Whoops!',
                message: 'Your first name is missing. Please go back and fill in your first name.'
            });
            return;
        }

        // Show an error page
        res.render('error', {
            title: 'Whoops!',
            message: 'The last name you\'ve entered does not seem to be valid. Please go back and enter your real last name.'
        });
        return;
    }

    // TODO: Make sure a user with this mail address doens't already exist


    // Register the user
    UserDatabase.addUser(mail, password, firstName, lastName, function(err, user) {
        // Throw errors
        if(err !== null)
            throw err;

        // TODO: Do something with the user
    });

    // TODO: Create a session for the user?

    // TODO: Show a success page
});

module.exports = router;
