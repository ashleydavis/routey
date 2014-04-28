'use strict';

var mockery = require('mockery');
var S = require('string');
var path = require('path');

describe('route_init', function () {
	var RouteInitializer;
	var mockFileMgr;
	var mockApp;

	beforeEach(function () {
		mockery.enable();

		mockFileMgr = {	    
			jsFileExists: function (filePath) {
				return false;
			},
		};

		mockApp = {
			get: jasmine.createSpy(),
		};

		mockery.registerMock('fileMgr', mockFileMgr);
		mockery.registerAllowable('./route_init');
		mockery.registerAllowable('path');

		RouteInitializer = require('./route_init');
	});

	afterEach(function () {
		mockery.deregisterAllowable('./route_init');
		mockery.deregisterAllowable('path');
		mockery.deregisterMock('fileMgr');

		mockery.disable();
	});


	it('directory with get.js registers for HTTP get', function () {

		var config = {};
		var fileSystemPath = 'parent/child';
		var routePath = '/parent/child';
		var dir = {
			name: 'child',
			path: fileSystemPath,
			routePath: routePath,
		};

		mockFileMgr.jsFileExists = function (filePath) {
			// Return true to fake that our test file exists.
			return filePath === path.join(fileSystemPath, 'get.js');
		}

		var testObject = new RouteInitializer(config, mockApp);
		testObject._processDirectory(dir);

		expect(mockApp.get).toHaveBeenCalledWith(routePath, jasmine.any(Function));
	});

	it('directory without get.js does not register for HTTP get', function () {

		var config = {};
		var fileSystemPath = 'parent/child';
		var routePath = '/parent/child';
		var dir = {
			name: 'child',
			path: fileSystemPath,
			routePath: routePath,
		};

		mockFileMgr.jsFileExists = function (filePath) {
			// Return false to fake that our test file doesn't exists.
			return false;
		}

		var testObject = new RouteInitializer(config, mockApp);
		testObject._processDirectory(dir);

		expect(mockApp.get).not.toHaveBeenCalledWith(routePath, jasmine.any(Function));
	});
});