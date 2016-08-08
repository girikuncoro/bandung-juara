const router = require('express').Router();

router.get("/", function(req, res) {
	res.render('calendar.html');
});

module.exports = router;
