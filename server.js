var http = require("http");

var options = {
	host: 'jadwal.velotek.co.id',
	port: 80,
	path: '/api/v1/get-undangan',
	method: 'GET'
};

http.get(options, (res) => {
	console.log("Response: " + res.statusCode);
	res.setEncoding('utf8');
	res.on('data', (chunk) => {
		var data = JSON.parse(chunk);
		console.log(data);
	});
});
