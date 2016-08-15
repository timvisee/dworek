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

var login = require('./login');
var register = require('./register');
var about = require('./about');
var status = require('./status');

var appInfo = require('../../appInfo');

var Core = require('../../Core');
var CallbackLatch = require('../util/CallbackLatch');
var UserModel = require('../model/user/UserModel');

// Index page
router.get('/', function(req, res, next) {
  var sessionToken = req.cookies.session_token;

  var latch = new CallbackLatch();

  var loggedIn = false;
  var name = '';

  if(sessionToken !== undefined) {
    latch.add();
    Core.model.sessionModelManager.getSessionUserByTokenIfValid(sessionToken, function(err, user) {
      loggedIn = user !== null;

      if(loggedIn) {
        user.getFirstName(function(err, firstName) {
          name = firstName;

          latch.resolve();
        });
      } else {
        latch.resolve();
      }
    });
  }

  latch.then(function() {

    res.render('index', {
      title: appInfo.APP_NAME,
      hideBackButton: true,
      loggedIn,
      name
    });

  });
});

// Login page
router.use('/login', login);

// Register page
router.use('/register', register);

// About page
router.use('/about', about);

// Status page
router.use('/status', status);

module.exports = router;
