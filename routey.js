'use strict';

//
// Params
// 	config				-> Routey configuration.
//
// 		routeConfigPath -> Directory that contains route definitions.
//		urlRoot			-> Route path for route URLs.
//		verbose			-> Enable verbose logging so you can see what is happening.
//	
//	app				-> Express application object for route setup.
//
module.exports = function (config, app) {

	var path = require('path');
	var RouteInitalizer = require('./route_init');

	var routeInitalizer = new RouteInitalizer(config, app);

	var routeConfigDir = {
        name: path.basename(config.routeConfigPath),
        path: config.routeConfigPath,
        routePath: '/',
    };

    routeInitalizer._processDirectory(routeConfigDir);
};
