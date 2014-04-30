'use strict';

//
// Functions for initializing the routes.
//

module.exports = function RouteInitalizer(config, app) {

	var fileMgr = require('fileMgr');
	var path = require('path');

	//
	// Process a directory and configure routes that it defines.
	//
	this._processDirectory = function (dir) {

		var getJsPath = path.join(dir.path, 'get.js');
		if (fileMgr.jsFileExists(getJsPath)) {
			// Require in the user-defined route config.
			var getConfig = require('./' + getJsPath);

			app.get(dir.routePath, function (req, res) {
				// User-defined code handles the route.
				getConfig.handler(req, res);
			});
		}
	};

};
