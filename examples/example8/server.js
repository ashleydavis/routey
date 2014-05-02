
var path = require('path');
var express = require('express');

var app = express();

var routey = require('../../routey');

routey({
    routeConfigPath: path.join(__dirname, "rest"),
    parentRoute: '/customized-parent',
    verbose: true,
}, app);

var server = app.listen(3000);

module.exports = {
	app: app,
	server: server,
};

