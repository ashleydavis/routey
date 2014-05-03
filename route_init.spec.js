'use strict';

var mockery = require('mockery');
var S = require('string');
var path = require('path');

describe('route_init', function () {
	var RouteInitializer;
	var mockFileMgr;
	var mockApp;

	var config;
	var testObject;

	// List of files that the file manager shows as existing.
	var filesThatExist;

	//
	// Mocks that have been registered before or during a test and should be
	// unregistered after.
	//
	var registeredMocks = [];

	//
	// Register a require mock, the mock will be unregistered automatically
	// after the test.
	//
	var registerRequireMock = function (mockName, mock) {

		//console.log('Mocking: ' + mockName);

		mockery.registerMock(mockName, mock);

		registeredMocks.push(mockName);
	};

	//
	// Unregister all require mocks that have been registered to this point.
	//
	var unregisterRequireMocks = function () {

		registeredMocks.forEach(function (mockName) {
			mockery.deregisterMock(mockName);
		});

		registeredMocks = [];
	};

	beforeEach(function () {
		registeredMocks = [];

		mockery.enable();

		filesThatExist = [];

		mockFileMgr = {	    
			fileExists: function (filePath) {
				for (var i = 0; i < filesThatExist.length; ++i) {
					if (filePath == filesThatExist[i]) {
						return true;
					}
				}
				return false;
			},

			getDirectories: function (dir) {
				return [];
			},

		};

		mockApp = {
			get: jasmine.createSpy(),
		};

		registerRequireMock('./fileMgr', mockFileMgr);
		mockery.registerAllowable('./route_init');
		mockery.registerAllowable('path');

		RouteInitializer = require('./route_init');

		config = {};
		testObject = new RouteInitializer(config, mockApp);
	});

	afterEach(function () {
		mockery.deregisterAllowable('./route_init');
		mockery.deregisterAllowable('path');
		unregisterRequireMocks();

		mockery.disable();
	});

	// Helper: Create a directory to pass into route init.
	var initDir = function (childDirName, parentPath, parent) {
		parentPath = parentPath || "";
		if (arguments.length < 3) {
			parent = { 
				config: {},
			};
		}

		return {
			name: childDirName,
			path: path.join(parentPath, childDirName),
			parentRoute: '/' + parentPath,
			config: {},
			parent: parent,
		};
	};

	// Helper: Create a mock user-get-config.
	var initMockGetConfig = function (path) {
		filesThatExist.push(path);

		var mockGetConfig = {
			handler: jasmine.createSpy(),
		};
		
		registerRequireMock(testObject._formatPathForRequire(path), mockGetConfig);

		return mockGetConfig;
	};

	// Helper: Create a mock user-dir-config.	
	var initMockDirConfig = function (path) {
		var mockDirConfig = {
			openRoute: jasmine.createSpy(),
		};
		registerRequireMock(testObject._formatPathForRequire(path), mockDirConfig);

		filesThatExist.push(path);

		return mockDirConfig;
	};

	it('directory with get.js registers for HTTP get', function () {

		var parentDirName = 'parent';
		var childDirName = 'child';
		var dir = initDir(childDirName, parentDirName);

		var getConfigPath = path.join(parentDirName, childDirName, 'get.js');
		var mockGetConfig = initMockGetConfig(getConfigPath);

		testObject._processDirectory(dir);

		var expectedRoutePath = '/' + parentDirName + '/' + childDirName;
		expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('directory without get.js does not register for HTTP get', function () {

		var parentDirName = 'parent';
		var childDirName = 'child';
		var dir = initDir(childDirName, parentDirName);

		testObject._processDirectory(dir);

		expect(mockApp.get).not.toHaveBeenCalled();
	});

	it('when get.js exists, it is loaded to handle a route', function () {

		var childDirName = 'child';
		var parentDirName = 'parent';
		var dir = initDir(childDirName, parentDirName);

		var getConfigPath = path.join(parentDirName, childDirName, 'get.js');
		var mockGetConfig = initMockGetConfig(getConfigPath);

		testObject._processDirectory(dir);

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockGetConfig.handler)
			.toHaveBeenCalledWith(mockReq, mockRes, {}, jasmine.any(Function))
	});

	it('sub-directory with get.js registers for HTTP get', function () {

		var parentDirName = 'parent';
		var dir = initDir(parentDirName);

		var childDirName = 'child';
		mockFileMgr.getDirectories = function (dirPath) {
			if (dirPath === parentDirName) {
				return [ childDirName ];
			}
			else {
				return [];
			}
		};

		var getConfigPath = path.join(parentDirName, childDirName, 'get.js');
		var mockGetConfig = initMockGetConfig(getConfigPath);

		testObject._processDirectory(dir);

		var expectedRoutePath = '/' + parentDirName + '/' + childDirName;
		expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('when get.js exists in a sub-directory, it is loaded to handle a route', function () {

		var parentDirName = 'parent';
		var dir = initDir(parentDirName);

		var childDirName = 'child';
		mockFileMgr.getDirectories = function (dirPath) {
			if (dirPath === parentDirName) {
				return [ childDirName ];
			}
			else {
				return [];
			}
		};

		var getConfigPath = path.join(parentDirName, childDirName, 'get.js');
		var mockGetConfig = initMockGetConfig(getConfigPath);

		testObject._processDirectory(dir);

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockGetConfig.handler)
			.toHaveBeenCalledWith(mockReq, mockRes, {}, jasmine.any(Function))
	});	

    it('directory with route.js can customize its route', function () {

        var parentDirName = 'parent';
        var childDirName = 'child';
		var dir = initDir(childDirName, parentDirName);

        var getConfigPath = path.join(parentDirName, childDirName, 'get.js');
		var mockGetConfig = initMockGetConfig(getConfigPath);

        var dirConfigPath = path.join(parentDirName, childDirName, 'route.js');
        var mockDirConfig = initMockDirConfig(dirConfigPath);

        var customizedRouteName = 'customized-route';
        mockDirConfig.route = customizedRouteName;

        testObject._processDirectory(dir);

        var expectedRoutePath = '/' + parentDirName + '/' + customizedRouteName;
        expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
    }); 

    it('directory with route.js doesnt customize its route when it is not specified', function () {

        var parentDirName = 'parent';
        var childDirName = 'child';
        var dir = initDir(childDirName, parentDirName);

        var getConfigPath = path.join(parentDirName, childDirName, 'get.js');
		var mockGetConfig = initMockGetConfig(getConfigPath);

        var dirConfigPath = path.join(parentDirName, childDirName, 'route.js');
        var mockDirConfig = initMockDirConfig(dirConfigPath);

        testObject._processDirectory(dir);

        var expectedRoutePath = '/' + parentDirName + '/' + childDirName;
        expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
    }); 

	it('name of root directory doesnt appear in route path', function () {

		var rootDirName = 'root';
        var dir = initDir(rootDirName, "", null);

		var getConfigPath = path.join(rootDirName, 'get.js');
		var mockGetConfig = initMockGetConfig(getConfigPath);

		testObject._processDirectory(dir);

		var expectedRoutePath = '/';
		expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('route path can be customized', function () {

		var rootDirName = 'root';
        var dir = initDir(rootDirName, "", null);

		var getConfigPath = path.join(rootDirName, 'get.js');
		var mockGetConfig = initMockGetConfig(getConfigPath);

		var dirConfigPath = path.join(rootDirName, 'route.js');
        var mockDirConfig = initMockDirConfig(dirConfigPath);

		var customizedRoute = 'customized';
        mockDirConfig.route = customizedRoute;

		testObject._processDirectory(dir);

		var expectedRoutePath = '/' + customizedRoute;
		expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('route is opened', function () {

		var childDirName = 'child';
		var parentDirName = 'parent';
		var dir = initDir(childDirName, parentDirName);

		var getConfigPath = path.join(parentDirName, childDirName, 'get.js');
		var mockGetConfig = initMockGetConfig(getConfigPath);

		var dirConfigPath = path.join(parentDirName, childDirName, 'route.js');
        var mockDirConfig = initMockDirConfig(dirConfigPath);

		testObject._processDirectory(dir);

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockDirConfig.openRoute)
			.toHaveBeenCalledWith(mockReq, mockRes, {}, jasmine.any(Function));
	});

	it('parent route is opened when a child route is handled', function () {

		var parentDirName = 'parent';
		var dir = initDir(parentDirName);

		var childDirName = 'child';
		mockFileMgr.getDirectories = function (dirPath) {
			if (dirPath === parentDirName) {
				return [ childDirName ];
			}
			else {
				return [];
			}
		};

		var childGetConfigPath = path.join(parentDirName, childDirName, 'get.js');
		var mockGetConfig = initMockGetConfig(childGetConfigPath);

		var parentDirConfigPath = path.join(parentDirName, 'route.js');
        var mockDirConfig = initMockDirConfig(parentDirConfigPath);

		testObject._processDirectory(dir);

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockDirConfig.openRoute)
			.toHaveBeenCalledWith(mockReq, mockRes, {}, jasmine.any(Function))
	});	

	it('fully mocked parent is opened when a child route is handled', function () {

		var dirName = 'child';
		var parentDirName = 'parent';
		var dir = initDir(dirName, parentDirName, {
			config: {
					userConfig: {
						openRoute: jasmine.createSpy(),
					},
				},			
		});

		var getConfigPath = path.join(parentDirName, dirName, 'get.js');
		var mockGetConfig = initMockGetConfig(getConfigPath);

		testObject._processDirectory(dir);

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(dir.parent.config.userConfig.openRoute)
			.toHaveBeenCalledWith(mockReq, mockRes, {}, jasmine.any(Function))
	});	

	it('parent of parent is opened when a route is handled', function () {

		var childDirName = 'child';
		var parentDirName = 'parent';
		var dir = initDir(childDirName, parentDirName, {
			config: {
					userConfig: {
						openRoute: jasmine.createSpy(),
					},
				},			
		});

		var childGetConfigPath = path.join(parentDirName, childDirName, 'get.js');
		var mockGetConfig = initMockGetConfig(childGetConfigPath);

		testObject._processDirectory(dir);

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(dir.parent.config.userConfig.openRoute)
			.toHaveBeenCalledWith(mockReq, mockRes, {}, jasmine.any(Function))
	});	

	it('parameters from route open are passed to route handler', function () {

		var childDirName = 'child';
		var parentDirName = 'parent';
		var dir = initDir(childDirName, parentDirName);

		var getConfigPath = path.join(parentDirName, childDirName, 'get.js');
		var mockGetConfig = initMockGetConfig(getConfigPath);

		var dirConfigPath = path.join(parentDirName, childDirName, 'route.js');
        var mockDirConfig = initMockDirConfig(dirConfigPath);

        var mockParams = {};

        mockDirConfig.openRoute = function (req, res, params, done)  {
        	done(mockParams);
        };

		testObject._processDirectory(dir);

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockGetConfig.handler)
			.toHaveBeenCalledWith(mockReq, mockRes, mockParams, jasmine.any(Function));
	});

	it('parameters are passed to child route opener', function () {

		var childDirName = 'child';
		var parentDirName = 'parent';
		var mockParams = {};
		var dir = initDir(childDirName, parentDirName, {
			config: {
					userConfig: {
						openRoute: function (req, res, params, done) {
							done(mockParams);
						},
					},
				},			
		});

		var childDirConfigPath = path.join(parentDirName, childDirName, 'route.js');
		var mockDirConfig = initMockDirConfig(childDirConfigPath);

		var childGetConfigPath = path.join(parentDirName, childDirName, 'get.js');
		var mockGetConfig = initMockGetConfig(childGetConfigPath);

		testObject._processDirectory(dir);

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockDirConfig.openRoute)
			.toHaveBeenCalledWith(mockReq, mockRes, mockParams, jasmine.any(Function))
	});	
});