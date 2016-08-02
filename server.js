/**
 * Module dependencies.
 */
const express = require('express');

/**
 * Create express server.
 */
const app = express();

/**
 * Express configuration.
 */
app.set('port', process.env.PORT || 3000);
app.set("views", __dirname + '/views'); //Set up the views directory
app.engine('.html', require('ejs').__express);
app.set('view engine', 'html'); //Set EJS as templating language WITH html as an extension
app.use(express.static(__dirname + '/public')); //Add connection to the public folder for css & js files

/**
 * Primary app routes.
 */
app.use('/', require('./routes/index'));
app.use('/panic', require('./routes/panic'));
app.use('/calendar', require('./routes/calendar'));

/**
 * API routes.
 */
app.use('/api/v1/agenda', require('./routes/agenda'));

/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
  console.log('Dev server is now working on port ' + app.get('port') + ' ...');
});

module.exports = app;
