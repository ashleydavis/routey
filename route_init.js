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

		var route = this._formatPathAsRoute(path.join(dir.parentRoute, dir.name));

		// If the directory contains a 'get.js' load it is as a route config.
		var getJsPath = path.join(dir.path, 'get.js');
		if (fileMgr.fileExists(getJsPath)) {
			
			// Require in the user-defined route config.
			var getConfig = require(this._formatPathForRequire(getJsPath));

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
