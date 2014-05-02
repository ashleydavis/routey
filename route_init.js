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
	// Process a directory and configure routes that it defines.
	//
	this._processDirectory = function (dir) {

		//
		// Default the sub-route for the directory to the name of the directory,
		// But only for sub-directories, not for the root rest directory.
		//
		var isRoot = dir.name === dir.path;
		var subRouteName = isRoot ? "" : dir.name;

		// If the directory has a 'route.js' load it as a route config for the directory.
		var dirConfigPath = path.join(dir.path, 'route.js');
		if (fileMgr.fileExists(dirConfigPath)) {
			
			// Require in the user-defined directory config.
			var dirConfig = require(this._formatPathForRequire(dirConfigPath));

			logVerbose('Loaded dir config: ' + dirConfigPath);

			if (dirConfig.route) {
				// Retreive the route name from the directory config, if it is specified.
				subRouteName = dirConfig.route;
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
				getConfig.handler(req, res);
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
				});				
			});
	};
};
