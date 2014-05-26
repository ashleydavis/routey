'use strict';

//
// Functions for initializing the routes.
//

module.exports = function RouteInitalizer(config, app) {

	var that = this;	

    // Wire up the user provided logger (compatible with winston)...
    var logger = config.logger || 

    // Or just use console logging.
    {
        info: console.log,
        warn: console.log,
        error: console.log,
        debug: console.log,
    };

	var fileMgr = require('./fileMgr');
	var path = require('path');
	var util = require('util');

	// Log a verbose-only message.
	var logVerbose = function (msg) {
		if (!config.verbose) {
			return;
		}

		logger.info(msg);
	};

	//
	// Format a path for use by require.
	//
	this._formatPathForRequire = function (path) {
		return path.replace(/\\/g,"/");
	};

	//
	// Format a path to be used as a route.
	//
	this._formatPathAsRoute = function (path) {
		return path.replace(/\\/g,"/");
	};

	//
	// Used for managing async operations.
	//
	var Async = function (callback) {

		// Tracks whether the async operation has been started.
		var started = false;

		//
		// Start the async operation.
		//
		this.start = function () {
			started = true;

			return callback;
		};

		//
		// Returns true when an async operation has been started.
		//
		this.started = function () {
			return started;
		}
	};

	//
	// Open the requested route.
	// This is a recursive function that opens parent routes.
	//
	this._openRoute = function (dir, req, res, routeOpenDone) {

		//
		// Actually open this route (probably after parent route has been opened).
		//
		var openThisRoute = function (params) {

			if (dir.config.userConfig && 
				dir.config.userConfig.openRoute) {
				// Invoke user-defined open route callback.
				var async = new Async(routeOpenDone);
				dir.config.userConfig.openRoute(req, res, params, async);

				if (!async.started()) {
					// No async operation was started.
					// Invoke callback directly to complete route opening.
					routeOpenDone(params);
				}
			}
			else {
				// No callback, just complete route opening.
				routeOpenDone(params);
			}
		}

		if (dir.parent) {
			// Open the parent route, then async open this route.
			this._openRoute(dir.parent, req, res, openThisRoute);
		}
		else {
			// No parent, directly open this route.
			var params = {};
			if (config.handlerParams) {
				params = util._extend(params, config.handlerParams);
			}
			openThisRoute(params);
		}
	};

	//
	// Closes a route after handling.
	//
	this._closeRoute = function (dir, req, res, params) {

		if (dir.config.userConfig &&
			dir.config.userConfig.closeRoute) {

			// Close the parent route.
			var closeParentRoute = function ()  {
				if (dir.parent) {
					// Async close parent routes.
					that._closeRoute(dir.parent, req, res, params);
				}
			}

			var async = new Async(closeParentRoute);
			dir.config.userConfig.closeRoute(req, res, params, async);

			if (!async.started()) {
				// No async operation was started.
				// Invoke callback directly to complete route closing.
				closeParentRoute();
			}			
		}
		else {
			if (dir.parent) {
				// Close parent routes.
				that._closeRoute(dir.parent, req, res, params);
			}
		}			
	};

	//
	// Generic route handler.
	//
	this._handleRoute = function (dir, routeConfig, req, res) {

		//
		// When the route has been opened, invoke the route handler.
		//
		var routeOpened = function (params) {
			// 
			// Close the route once it has been handled.
			//
			var closeRoute = function () {
				that._closeRoute(dir, req, res, params);
			};

			var async = new Async(closeRoute);
			routeConfig.handler(req, res, params, async);

			if (!async.started()) {
				// No async operation was started.
				// Close the route immediately.
				closeRoute();
			}			
		};

		//
		// Open the route and then invoke the route handler.
		//
		this._openRoute(dir, req, res, routeOpened);
	};

	//
	// Check for a config file in the directory that defines one of the HTTP verbs.
	// Eg check for get.js to defined a route for HTTP get.
	//
	this._checkForHttpVerb = function (dir, route, verb) {

		// If the directory contains a 'get.js' load it is as config for HTTP get.
		var verbConfigPath = path.join(dir.path, verb + '.js');
		if (fileMgr.fileExists(verbConfigPath)) {
			
			// Require in the user-defined HTTP get config.
			var verbConfig = require(this._formatPathForRequire(verbConfigPath));
			if (verbConfig instanceof Function) {
				verbConfig = verbConfig(config.handlerConfig);
			}

			if (!(verbConfig.handler instanceof Function)) {
				throw new Error("Route handler file '" + verbConfigPath + "' contains no 'handler' function.");
			}

			if (verbConfig.route) {
				route = path.join(route, verbConfig.route);
			}

			route = this._formatPathAsRoute(route);

			logVerbose('Loaded HTTP ' + verb + ' config: ' + verbConfigPath);
			logVerbose('Registering ' + verb + ' route: ' + route);

			app[verb](route, function (req, res) {

				// User-defined code handles the route.
				that._handleRoute(dir, verbConfig, req, res);				
			});
		}
	};

	var httpVerbs = [
		'get',
		'post',
		'put',
		'delete',
	];

	//
	// Process a directory and configure routes that it defines.
	//
	this._processDirectory = function (dir) {

		//
		// Default the sub-route for the directory to the name of the directory,
		// But only for sub-directories, not for the root rest directory.
		//
		var subRouteName = dir.parent ? dir.name : "";

		// If the directory has a 'route.js' load it as a route config for the directory.
		var dirConfigPath = path.join(dir.path, 'route.js');
		if (fileMgr.fileExists(dirConfigPath)) {
		
			// Require in the user-defined directory config.
			var routeConfig = require(this._formatPathForRequire(dirConfigPath));
			if (routeConfig instanceof Function) {
				routeConfig = routeConfig(config.handlerConfig);
			}
			dir.config.userConfig = routeConfig;

			logVerbose('Loaded dir config: ');
			logVerbose(dir.config.userConfig);

			if (dir.config.userConfig.route) {
				// Retreive the route name from the directory config, if it is specified.
				subRouteName = dir.config.userConfig.route;
			}
		}

		var route = path.join(dir.parentRoute, subRouteName);

		logVerbose('Directory route: ' + route);

		httpVerbs.forEach(function (verb) {
			that._checkForHttpVerb(dir, route, verb);
		})

		// Recursively process sub directories.
		fileMgr
			.getDirectories(dir.path)
			.forEach(function (subDirName) {
			
				that._processDirectory({
					name: subDirName,
					path: path.join(dir.path, subDirName),
					parentRoute: route,
					isRoot: false,
					config: {},
					parent: dir,
				});
			});
	};
};
