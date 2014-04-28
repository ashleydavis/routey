'use strict';

var RouteInitalizer = require('./route_init');

//
// Params
// 	config			-> Routey configuration.
//
// 		routesDir 	-> Directory that contains route definitions.
//		urlRoot		-> Route path for route URLs.
//		verbose		-> Enable verbose logging so you can see what is happening.
//	
//	app				-> Express application object for route setup.
//
module.exports = function (config, app) {

	var routeInitalizer = new RouteInitalizer(config, app);
};