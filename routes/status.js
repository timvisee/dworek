var express = require('express');
var router = express.Router();
var os = require('os');

var appInfo = require('../appInfo');

// Status index
router.get('/', function(req, res, next) {
    res.render('status', {
        title: 'Application status',

        uptime: Math.round(os.uptime())
    });
});

module.exports = router;
