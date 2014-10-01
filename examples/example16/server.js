
var path = require('path');
var express = require('express');

var app = express();

// Support JSON encoded body.
var bodyParser = require('body-parser');
app.use(bodyParser());

var routey = require('../../routey');

routey({
    routeConfigPath: path.join(__dirname, "rest"),
    verbose: true,
}, app);

var server = app.listen(3000);

module.exports = {
	app: app,
	server: server,
};

