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

		if (fileMgr.jsFileExists(path.join(dir.path, 'get.js'))) {
			app.get(dir.routePath, function (req, res) {
				//todo: do something!
			});
		}
	};

};
