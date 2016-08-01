var express = require('express');
var router = express.Router();

var appInfo = require('../appInfo');

// Status index
router.get('/', function(req, res, next) {
    res.render('status', {
        title: 'Application status',

        // TODO: Always include these parameters, in every page render
        appName: appInfo.APP_NAME,
        appVersionName: appInfo.VERSION_NAME,
        appVersionCode: appInfo.VERSION_CODE
    });
});

module.exports = router;
