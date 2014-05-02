'use strict';

var mockery = require('mockery');
var S = require('string');
var path = require('path');

describe('route_init', function () {
	var RouteInitializer;
	var mockFileMgr;
	var mockApp;

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
	});

	afterEach(function () {
		mockery.deregisterAllowable('./route_init');
		mockery.deregisterAllowable('path');
		unregisterRequireMocks();

		mockery.disable();
	});


	it('directory with get.js registers for HTTP get', function () {

		var config = {};
		var parentDirName = 'parent';
		var childDirName = 'child';
		var fileSystemPath = path.join(parentDirName, childDirName);
		var getConfigPath = path.join(fileSystemPath, 'get.js');
		var parentRoute = '/' + parentDirName;
		var expectedRoutePath = parentRoute + '/' + childDirName;
		var dir = {
			name: childDirName,
			path: fileSystemPath,
			parentRoute: parentRoute,
			isRoot: false,
			config: {},
			parent: null,
		};

		mockFileMgr.fileExists = function (filePath) {
			// Return true to fake that our test file exists.
			return filePath === getConfigPath;
		};

		var testObject = new RouteInitializer(config, mockApp);

		var mockGetConfig = {};
		registerRequireMock(testObject._formatPathForRequire(getConfigPath), mockGetConfig);

		testObject._processDirectory(dir);

		expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('directory without get.js does not register for HTTP get', function () {

		var config = {};
		var parentDirName = 'parent';
		var childDirName = 'child';
		var fileSystemPath = path.join(parentDirName, childDirName);
		var parentRoute = '/' + parentDirName;
		var expectedRoutePath = parentRoute + '/' + childDirName;
		var dir = {
			name: childDirName,
			path: fileSystemPath,
			parentRoute: parentRoute,
			isRoot: false,
			config: {},
			parent: null,
		};

		mockFileMgr.fileExists = function (filePath) {
			// Return false to fake that our test file doesn't exists.
			return false;
		};

		var testObject = new RouteInitializer(config, mockApp);
		testObject._processDirectory(dir);

		expect(mockApp.get).not.toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('when get.js exists, it is loaded to handle a route', function () {

		var config = {};
		var fileSystemPath = 'parent/child';
		var getConfigPath = path.join(fileSystemPath, 'get.js');
		var dir = {
			name: 'child',
			path: fileSystemPath,
			parentRoute: 'this doesnt matter here',
			isRoot: false,
			config: {},
			parent: null,
		};

		mockFileMgr.fileExists = function (filePath) {
				// Return true to fake that our test file exists.
			return filePath === getConfigPath;
		};

		var testObject = new RouteInitializer(config, mockApp);

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

		var config = {};
		var childDirName = 'child';
		var parentDirName = 'parent';
		var fileSystemPath = path.join('root', parentDirName);
		var parentRoutePath = '/' + parentDirName;
		var expectedRoutePath = parentRoutePath + '/' + childDirName;
		var dir = {
			name: parentDirName,
			path: fileSystemPath,
			parentRoute: '/',
			isRoot: false,
			config: {},
			parent: null,
		};

		var childFileSystemPath = path.join(fileSystemPath, childDirName);
		var getConfigPath = path.join(childFileSystemPath, 'get.js');

		// Mock out directories.
		mockFileMgr.getDirectories = function (dirPath) {
			if (dirPath === fileSystemPath) {
				return [ childDirName ];
			}
			else {
				return [];
			}
		};

		mockFileMgr.fileExists = function (filePath) {
			// Return true to fake that our test file exists.
			return filePath === getConfigPath;
		};

		var testObject = new RouteInitializer(config, mockApp);

		var mockGetConfig = {};
		registerRequireMock(testObject._formatPathForRequire(getConfigPath), mockGetConfig);

		testObject._processDirectory(dir);

		expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('when get.js exists in a sub-directory, it is loaded to handle a route', function () {

		var config = {};
		var childDirName = 'child';
		var parentDirName = 'parent';
		var fileSystemPath = path.join('root', parentDirName);
		var parentRoutePath = '/' + parentDirName;
		var expectedRoutePath = parentRoutePath + '/' + childDirName;
		var dir = {
			name: parentDirName,
			path: fileSystemPath,
			parentRoute: '/',
			isRoot: false,
			config: {},
			parent: null,
		};

		var childFileSystemPath = path.join(fileSystemPath, childDirName);
		var getConfigPath = path.join(childFileSystemPath, 'get.js');

		// Mock out directories.
		mockFileMgr.getDirectories = function (dirPath) {
			if (dirPath === fileSystemPath) {
				return [ childDirName ];
			}
			else {
				return [];
			}
		};

		mockFileMgr.fileExists = function (filePath) {
			// Return true to fake that our test file exists.
			return filePath === getConfigPath;
		};

		var testObject = new RouteInitializer(config, mockApp);

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

    it('directory with route.js can customize its route', function () {

    	var config = {};
        var parentDirName = 'parent';
        var childDirName = 'child';
        var customizedRouteName = 'customized-route';
        var fileSystemPath = path.join(parentDirName, childDirName);
        var getConfigPath = path.join(fileSystemPath, 'get.js');
        var dirConfigPath = path.join(fileSystemPath, 'route.js');
        var parentRoutePath = '/' + parentDirName;
        var expectedRoutePath = parentRoutePath + '/' + customizedRouteName;

        var dir = {
            name: childDirName,
            path: fileSystemPath,
            parentRoute: parentRoutePath,
            isRoot: false,
            config: {},
            parent: null,
        };

        mockFileMgr.fileExists = function (filePath) {
            // Return true to fake that our test file exists.
            return filePath === getConfigPath ||
                   filePath === dirConfigPath;
        };

        var testObject = new RouteInitializer(config, mockApp);

        var mockGetConfig = {};
        registerRequireMock(testObject._formatPathForRequire(getConfigPath), mockGetConfig);

        var mockDirConfig = {
        	route: customizedRouteName,
        };
        registerRequireMock(testObject._formatPathForRequire(dirConfigPath), mockDirConfig);

        testObject._processDirectory(dir);

        expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
    }); 

    it('directory with route.js doesnt customize its route when it is not specified', function () {

    	var config = {};
        var parentDirName = 'parent';
        var childDirName = 'child';
        var customizedRouteName = 'customized-route';
        var fileSystemPath = path.join(parentDirName, childDirName);
        var getConfigPath = path.join(fileSystemPath, 'get.js');
        var dirConfigPath = path.join(fileSystemPath, 'route.js');
        var parentRoutePath = '/' + parentDirName;
        var expectedRoutePath = parentRoutePath + '/' + childDirName;

        var dir = {
            name: childDirName,
            path: fileSystemPath,
            parentRoute: parentRoutePath,
            isRoot: false,
            config: {},
            parent: null,
        };

        mockFileMgr.fileExists = function (filePath) {
            // Return true to fake that our test file exists.
            return filePath === getConfigPath ||
                   filePath === dirConfigPath;
        };

        var testObject = new RouteInitializer(config, mockApp);

        var mockGetConfig = {};
        registerRequireMock(testObject._formatPathForRequire(getConfigPath), mockGetConfig);

        var mockDirConfig = {};
        registerRequireMock(testObject._formatPathForRequire(dirConfigPath), mockDirConfig);

        testObject._processDirectory(dir);

        expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
    }); 

	it('name of root directory doesnt appear in route path', function () {

		var config = {};
		var rootDirName = 'root';
		var fileSystemPath = rootDirName;
		var getConfigPath = path.join(fileSystemPath, 'get.js');
		var expectedRoutePath = '/';
		var dir = {
			name: rootDirName,
			path: rootDirName,
			parentRoute: '/',
			isRoot: true,
			config: {},
			parent: null,
		};

		mockFileMgr.fileExists = function (filePath) {
			// Return true to fake that our test file exists.
			return filePath === getConfigPath;
		};

		var testObject = new RouteInitializer(config, mockApp);

		var mockGetConfig = {};
		registerRequireMock(testObject._formatPathForRequire(getConfigPath), mockGetConfig);

		testObject._processDirectory(dir);

		expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('route path can be customized', function () {

		var config = {};
		var rootDirName = 'root';
		var fileSystemPath = rootDirName;
		var getConfigPath = path.join(fileSystemPath, 'get.js');
		var dirConfigPath = path.join(fileSystemPath, 'route.js');
		var customizedRoute = 'customized';
		var expectedRoutePath = '/' + customizedRoute;

		var dir = {
			name: rootDirName,
			path: rootDirName,
			parentRoute: '/',
			isRoot: true,
			config: {},
			parent: null,
		};

		mockFileMgr.fileExists = function (filePath) {
			// Return true to fake that our test file exists.
            return filePath === getConfigPath ||
                   filePath === dirConfigPath;
		};

		var testObject = new RouteInitializer(config, mockApp);

		var mockGetConfig = {};
		registerRequireMock(testObject._formatPathForRequire(getConfigPath), mockGetConfig);

        var mockDirConfig = {
        	route: customizedRoute
        };
        registerRequireMock(testObject._formatPathForRequire(dirConfigPath), mockDirConfig);

		testObject._processDirectory(dir);

		expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('parent route is opened when a child route is handled', function () {

		var config = {};
		var childDirName = 'child';
		var parentDirName = 'parent';
		var fileSystemPath = parentDirName;
		var parentRoutePath = '/' + parentDirName;
		var expectedRoutePath = parentRoutePath + '/' + childDirName;
		var dir = {
			name: parentDirName,
			path: fileSystemPath,
			parentRoute: '/',
			isRoot: false,
			config: {},
			parent: null,
		};

		var childFileSystemPath = path.join(fileSystemPath, childDirName);
		var childGetConfigPath = path.join(childFileSystemPath, 'get.js');
		var parentDirConfigPath = path.join(fileSystemPath, 'route.js');

		// Mock out directories.
		mockFileMgr.getDirectories = function (dirPath) {
			if (dirPath === fileSystemPath) {
				return [ childDirName ];
			}
			else {
				return [];
			}
		};

		mockFileMgr.fileExists = function (filePath) {
			// Return true to fake that our test file exists.
			return filePath === childGetConfigPath || 
				   filePath === parentDirConfigPath;
		};

		var testObject = new RouteInitializer(config, mockApp);

		var mockGetConfig = {
			handler: jasmine.createSpy(),
		};
		registerRequireMock(testObject._formatPathForRequire(childGetConfigPath), mockGetConfig);

		var mockDirConfig = {
			openRoute: jasmine.createSpy(),
		};
		registerRequireMock(testObject._formatPathForRequire(parentDirConfigPath), mockDirConfig);


		testObject._processDirectory(dir);

		console.log('{{');

		console.log(dir);

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockDirConfig.openRoute).toHaveBeenCalledWith(mockReq, mockRes)
	});	

	it('fully mocked parent is opened when a child route is handled', function () {

		var config = {};
		var dirName = 'parent';
		var fileSystemPath = dirName;
		var parentRoutePath = '/' + dirName;
		var expectedRoutePath = parentRoutePath;
		var dir = {
			name: dirName,
			path: fileSystemPath,
			parentRoute: '/',
			isRoot: false,
			config: {},
			parent: {
				config: {
					userConfig: {
						openRoute: jasmine.createSpy(),
					},
				},
			},
		};

		var getConfigPath = path.join(fileSystemPath, 'get.js');

		mockFileMgr.fileExists = function (filePath) {
			// Return true to fake that our test file exists.
			return filePath === getConfigPath;
		};

		var testObject = new RouteInitializer(config, mockApp);

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

		var config = {};
		var childDirName = 'child';
		var parentDirName = 'parent';
		var fileSystemPath = parentDirName;
		var parentRoutePath = '/' + parentDirName;
		var expectedRoutePath = parentRoutePath + '/' + childDirName;
		var dir = {
			name: parentDirName,
			path: fileSystemPath,
			parentRoute: '/',
			isRoot: false,
			config: {},
			parent: {
				config: {
					userConfig: {
						openRoute: jasmine.createSpy(),
					},
				},
			},
		};

		var childFileSystemPath = path.join(fileSystemPath, childDirName);
		var childGetConfigPath = path.join(childFileSystemPath, 'get.js');

		// Mock out directories.
		mockFileMgr.getDirectories = function (dirPath) {
			if (dirPath === fileSystemPath) {
				return [ childDirName ];
			}
			else {
				return [];
			}
		};

		mockFileMgr.fileExists = function (filePath) {
			// Return true to fake that our test file exists.
			return filePath === childGetConfigPath;
		};

		var testObject = new RouteInitializer(config, mockApp);

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