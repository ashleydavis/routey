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

	if (httpMethod === 'post' && !argv.data) {
		throw new Error('HTTP post expects data option: ---data=<data-to-post>');
	}

	var routey = require('./routey');

	var routes = {
		get: {},
		post: {},
	};
	var postRoutes = {};

	// Mock app.
	var app = {
		get: function (url, handler) {
			routes.get[url] = handler;
		},
		post: function (url, handler) {
			routes.post[url] = handler;
		},
	}; 

	var config = loadConfig();
	routey(config, app);

	if (verbose) {
		Object.keys(routes).forEach(function (httpMethod) {
			console.log(httpMethod + ':');
			console.log('\t' + Object.keys(routes[httpMethod]));
		});
	}

	if (!routes[httpMethod]) {
		throw new Error("Invalid http method: " + httpMethod);
	}

	var handlerToTest = routes[httpMethod][urlToTest];
	if (!handlerToTest) {
		throw new Error('Handler not registered for ' + httpMethod + ' ' + urlToTest);
	}

	//
	// Mock request.
	//
	var req = {
		body: argv.data,
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
}

function initAndListRoutes() {

	var routey = require('./routey');

	// Mock app.
	var app = {
		get: function (url, handler) {
			console.log('GET ' + url)
		},
		post: function (url, handler) {
			console.log('POST ' + url)
		},
	}; 

	var config = loadConfig();
	routey(config, app);
}