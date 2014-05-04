'use strict';

//
// Functions for initializing the routes.
//

module.exports = function RouteInitalizer(config, app) {

	var that = this;	

	var fileMgr = require('./fileMgr');
	var path = require('path');

	// Log a verbose-only message.
	var logVerbose = function (msg) {
		if (!config.verbose) {
			return;
		}

		console.log(msg);
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
				dir.config.userConfig.openRoute(req, res, params, routeOpenDone);
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
			openThisRoute({});
		}
	};

	//
	// Closes a route after handling.
	//
	this._closeRoute = function (dir, req, res, params) {

		if (dir.config.userConfig &&
			dir.config.userConfig.closeRoute) {

			dir.config.userConfig.closeRoute(req, res, params, function (params)  {
				if (dir.parent) {
					// Async close parent routes.
					that._closeRoute(dir.parent, req, res, params);
				}
			});
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
			routeConfig.handler(req, res, params, function () {
				that._closeRoute(dir, req, res, params);
			});
		};

		//
		// Open the route and then invoke the route handler.
		//
		this._openRoute(dir, req, res, routeOpened);
	};

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
			dir.config.userConfig = require(this._formatPathForRequire(dirConfigPath));

			logVerbose('Loaded dir config: ');
			logVerbose(dir.config.userConfig);

			if (dir.config.userConfig.route) {
				// Retreive the route name from the directory config, if it is specified.
				subRouteName = dir.config.userConfig.route;
			}
		}

		var route = this._formatPathAsRoute(path.join(dir.parentRoute, subRouteName));

		logVerbose('Directory route: ' + route);

		// If the directory contains a 'get.js' load it is as config for HTTP get.
		var getConfigPath = path.join(dir.path, 'get.js');
		if (fileMgr.fileExists(getConfigPath)) {
			
			// Require in the user-defined HTTP get config.
			var getConfig = require(this._formatPathForRequire(getConfigPath));

			logVerbose('Loaded HTTP get config: ' + getConfigPath);
			logVerbose('Registering route: ' + route);

			app.get(route, function (req, res) {

				// User-defined code handles the route.
				that._handleRoute(dir, getConfig, req, res);				
			});
		}

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
