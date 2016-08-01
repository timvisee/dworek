var express = require('express');
var router = express.Router();

var about = require('./about');
var status = require('./status');

var appInfo = require('../appInfo');

// Index page
router.get('/', function(req, res, next) {
  res.render('index', {
    title: appInfo.APP_NAME
  });
});

// About page
router.use('/about', about);

// Status page
router.use('/status', status);

module.exports = router;
