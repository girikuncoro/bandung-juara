var http = require('http');
const router = require('express').Router();

var options = {
	host: 'jadwal.velotek.co.id',
	port: 80,
	path: '/api/v1/get-undangan',
	method: 'GET'
};

router.get('/', (req, res) => {
	var data = "";
	http.get(options, (r) => {
		r.setEncoding('utf8');
		r.on('data', (chunk) => {
			data += chunk;
		});
		r.on('end', () => {
			try {
				jsonData = JSON.parse(data);
				res.json({ total: jsonData.result.length, data: jsonData });
			} catch(err) {
				console.log(err);
				res.json({ total: 0, data: null });
			}
		});
	});
});

module.exports = router;
