const router = require('express').Router();

router.get("/", function(req, res) {
	res.render('login.html');
});

module.exports = router;
