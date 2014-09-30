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
	console.log('URL: ' + urlToTest);
}

if (argv.routes) {
	if (verbose) {
		console.log("Routes:");
	}
	initAndListRoutes();
	return;
}

if (argv._.length != 1) {
	console.log('Usage:');
	console.log('\tnode routey_testbed.js [--config=<path>] <url-to-test>');
	console.log('Or (to list routes):');
	console.log('\tnode routey_testbed.js --routes');
	return;
}

var urlToTest = argv._[0];


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
		var configFilePath = './routey-config';
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

	var routey = require('./routey');

	var routes = {};

	// Mock app.
	var app = {
		get: function (url, handler) {
			routes[url] = handler;
		},
	}; 

	var config = loadConfig();
	routey(config, app);

	var handlerToTest = routes[urlToTest];
	if (!handlerToTest) {
		throw new Error("Handler not registered for url: " + urlToTest);
	}

	//
	// Mock request.
	//
	var req = {

	};

	// 
	// Mock response.
	//
	var res = {
		send: function (text) {
			console.log('text');
		},
	};

	if (verbose) {
		console.log('Invoking url: ' + urlToTest);	
	}

	handlerToTest(req, res);
}

function initAndListRoutes() {

	var routey = require('./routey');

	// Mock app.
	var app = {
		get: function (url, handler) {
			 console.log(url)
		},
	}; 

	var config = loadConfig();
	routey(config, app);
}