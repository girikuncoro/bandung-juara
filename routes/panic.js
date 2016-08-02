const router = require('express').Router();

router.get("/", function(req, res) {
	res.render('panic.html');
});

module.exports = router;
