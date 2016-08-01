var express = require('express');
var router = express.Router();

// About index
router.get('/', function(req, res, next) {
    res.render('about', {
        title: 'About'
    });
});

module.exports = router;
