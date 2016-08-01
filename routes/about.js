var express = require('express');
var router = express.Router();

var appInfo = require('../appInfo');

// About index
router.get('/', function(req, res, next) {
    res.render('about', {
        title: 'About',

        // TODO: Always include these parameters, in every page render
        appName: appInfo.APP_NAME,
        appVersionName: appInfo.VERSION_NAME,
        appVersionCode: appInfo.VERSION_CODE
    });
});

module.exports = router;
