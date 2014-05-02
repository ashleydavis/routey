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

		mockFileMgr = {	    
			fileExists: function (filePath) {
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

	it('directory with get.js registers for HTTP get', function () {

		var parentDirName = 'parent';
		var childDirName = 'child';
		var getConfigPath = path.join(parentDirName, childDirName, 'get.js');
		var expectedRoutePath = '/' + parentDirName + '/' + childDirName;
		var dir = initDir(childDirName, parentDirName);

		mockFileMgr.fileExists = function (filePath) {
			// Return true to fake that our test file exists.
			return filePath === getConfigPath;
		};

		var mockGetConfig = {};
		registerRequireMock(testObject._formatPathForRequire(getConfigPath), mockGetConfig);

		testObject._processDirectory(dir);

		expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('directory without get.js does not register for HTTP get', function () {

		var parentDirName = 'parent';
		var childDirName = 'child';
		var fileSystemPath = path.join(parentDirName, childDirName);
		var parentRoute = '/' + parentDirName;
		var expectedRoutePath = parentRoute + '/' + childDirName;
		var dir = initDir(childDirName, parentDirName);

		mockFileMgr.fileExists = function (filePath) {
			// Return false to fake that our test file doesn't exists.
			return false;
		};

		testObject._processDirectory(dir);

		expect(mockApp.get).not.toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('when get.js exists, it is loaded to handle a route', function () {

		var fileSystemPath = 'parent\\child';
		var getConfigPath = path.join(fileSystemPath, 'get.js');
		var dir = initDir('child', 'parent');

		mockFileMgr.fileExists = function (filePath) {
				// Return true to fake that our test file exists.
			return filePath === getConfigPath;
		};

		// Mock for the route configuration loaded from the file.
		var mockGetConfig = {
			handler: jasmine.createSpy(),
		};
		
		registerRequireMock(testObject._formatPathForRequire(getConfigPath), mockGetConfig);

		testObject._processDirectory(dir);

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockGetConfig.handler).toHaveBeenCalledWith(mockReq, mockRes)
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
		mockFileMgr.fileExists = function (filePath) {
			return filePath === getConfigPath;
		};

		var mockGetConfig = {};
		registerRequireMock(testObject._formatPathForRequire(getConfigPath), mockGetConfig);

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
		mockFileMgr.fileExists = function (filePath) {
			return filePath === getConfigPath;
		};

		var mockGetConfig = {
			handler: jasmine.createSpy(),
		};
		registerRequireMock(testObject._formatPathForRequire(getConfigPath), mockGetConfig);

		testObject._processDirectory(dir);

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockGetConfig.handler).toHaveBeenCalledWith(mockReq, mockRes)
	});	

    it('directory with route.js can customize its route', function () {

        var parentDirName = 'parent';
        var childDirName = 'child';
		var dir = initDir(childDirName, parentDirName);

        var getConfigPath = path.join(parentDirName, childDirName, 'get.js');
        var dirConfigPath = path.join(parentDirName, childDirName, 'route.js');
        mockFileMgr.fileExists = function (filePath) {
            return filePath === getConfigPath ||
                   filePath === dirConfigPath;
        };

        var mockGetConfig = {};
        registerRequireMock(testObject._formatPathForRequire(getConfigPath), mockGetConfig);

        var customizedRouteName = 'customized-route';
        var mockDirConfig = {
        	route: customizedRouteName,
        };
        registerRequireMock(testObject._formatPathForRequire(dirConfigPath), mockDirConfig);

        testObject._processDirectory(dir);

        var expectedRoutePath = '/' + parentDirName + '/' + customizedRouteName;
        expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
    }); 

    it('directory with route.js doesnt customize its route when it is not specified', function () {

        var parentDirName = 'parent';
        var childDirName = 'child';
        var dir = initDir(childDirName, parentDirName);

        var getConfigPath = path.join(parentDirName, childDirName, 'get.js');
        var dirConfigPath = path.join(parentDirName, childDirName, 'route.js');
        mockFileMgr.fileExists = function (filePath) {
            return filePath === getConfigPath ||
                   filePath === dirConfigPath;
        };

        var mockGetConfig = {};
        registerRequireMock(testObject._formatPathForRequire(getConfigPath), mockGetConfig);

        var mockDirConfig = {};
        registerRequireMock(testObject._formatPathForRequire(dirConfigPath), mockDirConfig);

        testObject._processDirectory(dir);

        var expectedRoutePath = '/' + parentDirName + '/' + childDirName;
        expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
    }); 

	it('name of root directory doesnt appear in route path', function () {

		var rootDirName = 'root';
        var dir = initDir(rootDirName, "", null);

		var getConfigPath = path.join(rootDirName, 'get.js');
		mockFileMgr.fileExists = function (filePath) {
			return filePath === getConfigPath;
		};

		var mockGetConfig = {};
		registerRequireMock(testObject._formatPathForRequire(getConfigPath), mockGetConfig);

		testObject._processDirectory(dir);

		var expectedRoutePath = '/';
		expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('route path can be customized', function () {

		var rootDirName = 'root';
        var dir = initDir(rootDirName, "", null);

		var getConfigPath = path.join(rootDirName, 'get.js');
		var dirConfigPath = path.join(rootDirName, 'route.js');
		mockFileMgr.fileExists = function (filePath) {
            return filePath === getConfigPath ||
                   filePath === dirConfigPath;
		};

		var mockGetConfig = {};
		registerRequireMock(testObject._formatPathForRequire(getConfigPath), mockGetConfig);

		var customizedRoute = 'customized';
        var mockDirConfig = {
        	route: customizedRoute
        };
        registerRequireMock(testObject._formatPathForRequire(dirConfigPath), mockDirConfig);

		testObject._processDirectory(dir);

		var expectedRoutePath = '/' + customizedRoute;
		expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('route is opened', function () {

		var childDirName = 'child';
		var parentDirName = 'parent';
		var dir = initDir(childDirName, parentDirName);

		var getConfigPath = path.join(parentDirName, childDirName, 'get.js');
		var dirConfigPath = path.join(parentDirName, childDirName, 'route.js');
		mockFileMgr.fileExists = function (filePath) {
			return filePath === getConfigPath ||
				   filePath === dirConfigPath;
		};

		var mockGetConfig = {
			handler: jasmine.createSpy(),
		};
		
		registerRequireMock(testObject._formatPathForRequire(getConfigPath), mockGetConfig);

		var mockDirConfig = {
			openRoute: jasmine.createSpy(),
		};
		
		registerRequireMock(testObject._formatPathForRequire(dirConfigPath), mockDirConfig);

		testObject._processDirectory(dir);

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockDirConfig.openRoute).toHaveBeenCalledWith(mockReq, mockRes)
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
		var parentDirConfigPath = path.join(parentDirName, 'route.js');
		mockFileMgr.fileExists = function (filePath) {
			return filePath === childGetConfigPath || 
				   filePath === parentDirConfigPath;
		};

		var mockGetConfig = {
			handler: jasmine.createSpy(),
		};
		registerRequireMock(testObject._formatPathForRequire(childGetConfigPath), mockGetConfig);

		var mockDirConfig = {
			openRoute: jasmine.createSpy(),
		};
		registerRequireMock(testObject._formatPathForRequire(parentDirConfigPath), mockDirConfig);


		testObject._processDirectory(dir);

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockDirConfig.openRoute).toHaveBeenCalledWith(mockReq, mockRes)
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
		mockFileMgr.fileExists = function (filePath) {
			return filePath === getConfigPath;
		};

		var mockGetConfig = {
			handler: jasmine.createSpy(),
		};
		registerRequireMock(testObject._formatPathForRequire(getConfigPath), mockGetConfig);

		testObject._processDirectory(dir);

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(dir.parent.config.userConfig.openRoute).toHaveBeenCalledWith(mockReq, mockRes)
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
		mockFileMgr.fileExists = function (filePath) {
			return filePath === childGetConfigPath;
		};

		var mockGetConfig = {
			handler: jasmine.createSpy(),
		};
		registerRequireMock(testObject._formatPathForRequire(childGetConfigPath), mockGetConfig);

		testObject._processDirectory(dir);

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(dir.parent.config.userConfig.openRoute).toHaveBeenCalledWith(mockReq, mockRes)
	});	

});