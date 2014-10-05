'use strict';

//
// Command line testbed for REST API.
//
// Usage:
//
//	node routey_testbed.js [--config=<path-to-json-config>] <url-to-test>
//
// If --config is not specified a file in the working directory called routey-config.json will be used instead.
// If no config file is found the REST API is assumed to be defined in the 'rest' sub-directory.
//

var fs = require('fs');
var path = require('path');
var argv = require('yargs').argv;
var qs = require('querystring');

var verbose = argv.v || argv.verbose;

if (verbose) {
	console.log('Working directory: ' + process.cwd());
	console.log('Arguments:');
	console.log(argv);
}

if (argv.routes) {
	if (verbose) {
		console.log("Routes:");
	}
	initAndListRoutes();
	return;
}

if (argv._.length != 2) {
	console.log('Usage:');
	console.log('\tnode routey_testbed.js [--config=<path>] <http-method> <url-to-test>');
	console.log('Or (to list routes):');
	console.log('\tnode routey_testbed.js --routes');
	return;
}

initAndTest();

function loadConfig() {

	var defaultConfig = {
		routeConfigPath: path.join(process.cwd(), "rest"),
		verbose: verbose,
	};

	var config = null;

	if (argv.config) {
		var configFilePath = argv.config;
		if (verbose) {
			console.log('Using config file defined on command line: '+ configFilePath);
		}
		config =  JSON.parse(fs.readFileSync(configFilePath));
	} 
	else {
		var configFilePath = './routey-config.json';
		if (fs.existsSync(configFilePath)) {
			if (verbose) {
				console.log('Defaulting to config found in working directory: '+ configFilePath);
			}
			config = JSON.parse(fs.readFileSync(configFilePath));
		}
		else {
			if (verbose) {
				console.log('No config file specified or found, using default config.');
			}
			config = defaultConfig;
		}
	}

	if (verbose) {
		console.log('Config file:');
		console.log(config);
	}

	return config;
}

function initAndTest() {

	var httpMethod = argv._[0];
	var urlToTest = argv._[1];

	if ((httpMethod === 'post' || httpMethod === 'put') && 
		(!argv.data && !argv.dataFile)) {
		throw new Error('HTTP post/put expects data or data-file option:\n\t--data=<data-to-post>\n\t--data-file=<data-file-name>');
	}

	var data = argv.data;
	if (argv.dataFile) {
		if (verbose) {
			console.log("Loading data file: " + argv.dataFile);
		}
		data = fs.readFileSync(argv.dataFile, 'utf8');
	}

	if (verbose && data) {
		console.log('Using data:');
		console.log(data);
	}

	var routes = {
		get: {},
		post: {},
		put: {},
		delete: {},
	};
	var routeMap = {
		get: {},
		post: {},
		put: {},
		delete: {},
	};
	
	// Mock app.
	var app = {
		get: function (url, handler) {
			routes.get[url] = handler;
			registerRouteMap(routeMap.get, url, handler);
		},
		post: function (url, handler) {
			routes.post[url] = handler;
			registerRouteMap(routeMap.post, url, handler);
		},
		put: function (url, handler) {
			routes.put[url] = handler;
			registerRouteMap(routeMap.put, url, handler);
		},
		delete: function (url, handler) {
			routes.delete[url] = handler;
			registerRouteMap(routeMap.delete, url, handler);
		},
	}; 

	var config = loadConfig();
	var routey = require('./routey');
	routey(config, app);

	if (verbose) {
		Object.keys(routes).forEach(function (httpMethod) {
			console.log(httpMethod + ':');
			console.log('\t' + Object.keys(routes[httpMethod]));
		});

		console.log("Route map:");
		console.log(routeMap);
	}

	if (!routes[httpMethod]) {
		throw new Error("Invalid http method: " + httpMethod);
	}

	var urlAndQueryString = urlToTest.split('?');
	var url = urlAndQueryString[0];
	var queryString = urlAndQueryString.length > 1 ? urlAndQueryString[1] : null;
	var query = queryString && qs.parse(queryString) || {};

	var params = {};
	var handlerToTest = getRouteHandler(routeMap[httpMethod], url, params);

	//
	// Mock request.
	//
	var req = {
		body: data,
		params: params,
		query: query,
	};

	// 
	// Mock response.
	//
	var res = {
		send: function (text) {
			console.log(text);
		},
	};

	if (verbose) {
		console.log('Testing ' + httpMethod + ' ' + urlToTest);	
	}

	handlerToTest(req, res);
};

//
// Register the URL with the route  map so we can later search for the handler in the tree of routes.
//
function registerRouteMap (map, url, handler) {

	var urlParts = splitUrl(url);
	while (urlParts.length > 0) {

		var urlPart = urlParts.shift();
		if (!map[urlPart]) {
			map[urlPart] = {};
		}
		map = map[urlPart];
	}

	// End of the line.
	if (map.handler) {
		throw new Error("Handler for " + url + " has already been registered in the route map.");
	}

	map.handler = handler;
};

//
// Split a URL/route into parts and remove the empties.
//
function splitUrl (url) {
	var urlParts = url.split('/');
	var output = [];
	urlParts.forEach(function (part) {
		if (part) {
			output.push(part);
		}
	});

	return output;
};

//
// Search the route map and retreive a handler for the specified url.
// Throws an exception if the route doesn't exist.
//
function getRouteHandler(routeMap, url, params) {

	var urlParts = splitUrl(url);
	return searchRouteHandler(routeMap, urlParts, url, params);
};

function getParamName(subRoute) {
	var paramName = subRoute.substring(1);
	if (paramName[paramName.length-1] === '?') {
		paramName = paramName.substring(0, paramName.length-1);
	}
	return paramName;
};

//
// Matches a route part in the route map and returns the corresponding object.
// Throws for no match.
//
function matchUrlPart(routeMap, urlPart, url, params) {

	if (routeMap[urlPart])
	{
		// Direct match.
		return routeMap[urlPart];		
	}

	// Find first parameter match.
	var subRoutes = Object.keys(routeMap);
	for (var i = 0; i < subRoutes.length; ++i) {
		var subRoute = subRoutes[i];
		if (subRoute[0] === ':') {
			// Setup the parameter.
			params[getParamName(subRoute)] = urlPart;

			// Got it.
			return routeMap[subRoute];
		}
	}

	throw new Error("Failed to find " + url + " in route map.");
}

//
// Retreive a handler from the current level of the route map.
//
function getHandler(routeMap) {
	if (routeMap.handler) {
		// There is a direct handler at this level.
		return routeMap.handler;
	}

	// Find first optional match that has a handler.
	var subRoutes = Object.keys(routeMap);
	for (var i = 0; i < subRoutes.length; ++i) {
		var subRoute = subRoutes[i];
		if (subRoute[0] === ':') {
			if (subRoute[subRoute.length-1] === '?') {
				// Optional parameter.
				var handler = getHandler(routeMap[subRoute]);
				if (handler) {
					return handler;
				}
			}
		}
	}		

	return null;
}

//
// Recursively search the route map for a handler.
//
function searchRouteHandler(routeMap, urlParts, url, params) {
	
	if (urlParts.length == 0) {
		// Done searching the route map, we should have found a handler.
		var handler = getHandler(routeMap);
		if (!handler) {
			throw new Error("Route " + url + " is registered but has no handler.");		
		}
		return handler;
	}

	var subRouteMap = matchUrlPart(routeMap, urlParts.shift(), url, params);
	return searchRouteHandler(subRouteMap, urlParts, url, params);
};

function initAndListRoutes() {

	var routey = require('./routey');

	// Mock app.
	var app = {
		get: function (url, handler) {
			console.log('GET ' + url);
		},
		post: function (url, handler) {
			console.log('POST ' + url);
		},
		put: function (url, handler) {
			console.log('PUT ' + url);
		},
		delete: function (url, handler) {
			console.log('DELETE ' + url);
		},
	}; 

	var config = loadConfig();
	routey(config, app);
}