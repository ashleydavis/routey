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

	// Hash of paths and corresponding list of child directories.
	var dirsThatExist;

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
		dirsThatExist = {};

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
				return dirsThatExist[dir] || [];
			},
		};

		mockApp = {
			get: jasmine.createSpy(),
			post: jasmine.createSpy(),
			put: jasmine.createSpy(),
			delete: jasmine.createSpy(),
		};

		registerRequireMock('./fileMgr', mockFileMgr);
		mockery.registerAllowable('./route_init');
		mockery.registerAllowable('path');
		mockery.registerAllowable('util');

		RouteInitializer = require('./route_init');

		config = {};
		testObject = new RouteInitializer(config, mockApp);
	});

	afterEach(function () {
		mockery.deregisterAllowable('./route_init');
		mockery.deregisterAllowable('path');
		mockery.deregisterAllowable('util');
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
			handler: function (req, res, params, done) {
				done(params);
			},
		};

		spyOn(mockGetConfig, 'handler').andCallThrough();
		
		registerRequireMock(testObject._formatPathForRequire(path), function () {
			return mockGetConfig;
		});

		return mockGetConfig;
	};

	// Helper: Create a mock user-dir-config.	
	var initMockDirConfig = function (path) {
		var mockDirConfig = {
			openRoute: function (req, res, params, done) {
				done(params);
			},
			
			closeRoute: function (req, res, params, done) {
				done(params);
			},
		};

		spyOn(mockDirConfig, 'openRoute').andCallThrough();
		spyOn(mockDirConfig, 'closeRoute').andCallThrough();

		registerRequireMock(testObject._formatPathForRequire(path), function () {
			return mockDirConfig;
		});

		filesThatExist.push(path);

		return mockDirConfig;
	};

	it('directory with get.js registers for HTTP get', function () {

		var dirName = 'child';
		initMockGetConfig(path.join(dirName, 'get.js'));

		testObject._processDirectory(initDir(dirName));

		var expectedRoutePath = '/' + dirName;
		expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('directory without get.js does not register for HTTP get', function () {

		testObject._processDirectory(initDir('child'));

		expect(mockApp.get).not.toHaveBeenCalled();
	});

	it('directory with post.js registers for HTTP post', function () {

		var dirName = 'child';
		initMockGetConfig(path.join(dirName, 'post.js'));

		testObject._processDirectory(initDir(dirName));

		var expectedRoutePath = '/' + dirName;
		expect(mockApp.post).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('directory with put.js registers for HTTP put', function () {

		var dirName = 'child';
		initMockGetConfig(path.join(dirName, 'put.js'));

		testObject._processDirectory(initDir(dirName));

		var expectedRoutePath = '/' + dirName;
		expect(mockApp.put).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('directory with delete.js registers for HTTP delete', function () {

		var dirName = 'child';
		initMockGetConfig(path.join(dirName, 'delete.js'));

		testObject._processDirectory(initDir(dirName));

		var expectedRoutePath = '/' + dirName;
		expect(mockApp.delete).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('when get.js exists, it is loaded to handle a route', function () {

		var dirName = 'child';
		var mockGetConfig = initMockGetConfig(path.join(dirName, 'get.js'));

		testObject._processDirectory(initDir(dirName));

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockGetConfig.handler)
			.toHaveBeenCalledWith(mockReq, mockRes, {}, jasmine.any(Function))
	});

	it('handler params are passed thru to get.js handler', function () {

		var handlerParams = { my: 'param' };
		var config = {
			handlerParams: handlerParams,
		};
		var testObject = new RouteInitializer(config, mockApp);

		var dirName = 'child';
		var mockGetConfig = initMockGetConfig(path.join(dirName, 'get.js'));

		testObject._processDirectory(initDir(dirName));

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockGetConfig.handler)
			.toHaveBeenCalledWith(mockReq, mockRes, handlerParams, jasmine.any(Function))
	});

	it('get.js handler params are cloned from global handler params', function () {

		var handlerParams = { my: 'param' };
		var config = {
			handlerParams: handlerParams,
		};
		var testObject = new RouteInitializer(config, mockApp);

		var dirName = 'child';
		var mockGetConfig = initMockGetConfig(path.join(dirName, 'get.js'));

		mockGetConfig.handler = function (req, res, params, done) {
			params.test = "test";
		};

		testObject._processDirectory(initDir(dirName));

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(handlerParams.test).not.toBeDefined();
	});

	it('sub-directory with get.js registers for HTTP get', function () {

		var parentDirName = 'parent';
		var childDirName = 'child';
		dirsThatExist[parentDirName] = [ childDirName ];

		var mockGetConfig = initMockGetConfig(path.join(parentDirName, childDirName, 'get.js'));

		testObject._processDirectory(initDir(parentDirName));

		var expectedRoutePath = '/' + parentDirName + '/' + childDirName;
		expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('when get.js exists in a sub-directory, it is loaded to handle a route', function () {

		var parentDirName = 'parent';
		var childDirName = 'child';
		dirsThatExist[parentDirName] = [ childDirName ];

		var mockGetConfig = initMockGetConfig(path.join(parentDirName, childDirName, 'get.js'));

		testObject._processDirectory(initDir(parentDirName));

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockGetConfig.handler)
			.toHaveBeenCalledWith(mockReq, mockRes, {}, jasmine.any(Function))
	});	

    it('verb handlers can customize their route', function () {

        var dirName = 'child';
		var mockGetConfig = initMockGetConfig(path.join(dirName, 'get.js'));

        var customizedRouteName = 'customized-route';
        mockGetConfig.route = customizedRouteName;

        testObject._processDirectory(initDir(dirName));

        var expectedRoutePath = '/' + dirName + '/' + customizedRouteName;
        expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
    }); 

    it('directory with route.js can customize its route', function () {

        var parentDirName = 'parent';
        var childDirName = 'child';
		var mockGetConfig = initMockGetConfig(path.join(parentDirName, childDirName, 'get.js'));
        var mockDirConfig = initMockDirConfig(path.join(parentDirName, childDirName, 'route.js'));

        var customizedRouteName = 'customized-route';
        mockDirConfig.route = customizedRouteName;

        testObject._processDirectory(initDir(childDirName, parentDirName));

        var expectedRoutePath = '/' + parentDirName + '/' + customizedRouteName;
        expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
    }); 

    it('directory with route.js doesnt customize its route when it is not specified', function () {

        var parentDirName = 'parent';
        var childDirName = 'child';
		var mockGetConfig = initMockGetConfig(path.join(parentDirName, childDirName, 'get.js'));
        var mockDirConfig = initMockDirConfig(path.join(parentDirName, childDirName, 'route.js'));

        testObject._processDirectory(initDir(childDirName, parentDirName));

        var expectedRoutePath = '/' + parentDirName + '/' + childDirName;
        expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
    }); 

	it('name of root directory doesnt appear in route path', function () {

		var rootDirName = 'root';
		var mockGetConfig = initMockGetConfig(path.join(rootDirName, 'get.js'));

		testObject._processDirectory(initDir(rootDirName, "", null));

		var expectedRoutePath = '/';
		expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('route path can be customized', function () {

		var rootDirName = 'root';
		var mockGetConfig = initMockGetConfig(path.join(rootDirName, 'get.js'));
        var mockDirConfig = initMockDirConfig(path.join(rootDirName, 'route.js'));

		var customizedRoute = 'customized';
        mockDirConfig.route = customizedRoute;

		testObject._processDirectory(initDir(rootDirName, "", null));

		var expectedRoutePath = '/' + customizedRoute;
		expect(mockApp.get).toHaveBeenCalledWith(expectedRoutePath, jasmine.any(Function));
	});

	it('route is opened when handled', function () {

		var childDirName = 'child';
		var mockGetConfig = initMockGetConfig(path.join(childDirName, 'get.js'));
        var mockDirConfig = initMockDirConfig(path.join(childDirName, 'route.js'));

		testObject._processDirectory(initDir(childDirName));

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
		var childDirName = 'child';
		dirsThatExist[parentDirName] = [ childDirName ];

		var mockGetConfig = initMockGetConfig(path.join(parentDirName, childDirName, 'get.js'));
        var mockDirConfig = initMockDirConfig(path.join(parentDirName, 'route.js'));

		testObject._processDirectory(initDir(parentDirName));

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockDirConfig.openRoute)
			.toHaveBeenCalledWith(mockReq, mockRes, {}, jasmine.any(Function))
	});	

	it('mocked parent is opened when a child route is handled', function () {

		var dirName = 'child';
		var mockGetConfig = initMockGetConfig(path.join(dirName, 'get.js'));

		var parent = {
			config: {
					userConfig: {
						openRoute: jasmine.createSpy(),
					},
				},			
		};

		testObject._processDirectory(initDir(dirName, "", parent));

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(parent.config.userConfig.openRoute)
			.toHaveBeenCalledWith(mockReq, mockRes, {}, jasmine.any(Function))
	});	

	it('parameters from route open are passed to route handler', function () {

		var childDirName = 'child';
		var parentDirName = 'parent';
		var mockGetConfig = initMockGetConfig(path.join(parentDirName, childDirName, 'get.js'));
        var mockDirConfig = initMockDirConfig(path.join(parentDirName, childDirName, 'route.js'));

        var mockParams = {};

        mockDirConfig.openRoute = function (req, res, params, done)  {
        	done(mockParams);
        };

		testObject._processDirectory(initDir(childDirName, parentDirName));

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
		var mockDirConfig = initMockDirConfig(path.join(parentDirName, childDirName, 'route.js'));
		var mockGetConfig = initMockGetConfig(path.join(parentDirName, childDirName, 'get.js'));

		var mockParams = {};
		testObject._processDirectory(initDir(childDirName, parentDirName, {
			config: {
				userConfig: {
					openRoute: function (req, res, params, done) {
						done(mockParams);
					},
				},
			},			
		}));

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockDirConfig.openRoute)
			.toHaveBeenCalledWith(mockReq, mockRes, mockParams, jasmine.any(Function))
	});	

	it('route is closed after being handled', function () {

		var childDirName = 'child';
		var mockGetConfig = initMockGetConfig(path.join(childDirName, 'get.js'));
        var mockDirConfig = initMockDirConfig(path.join(childDirName, 'route.js'));

		testObject._processDirectory(initDir(childDirName));

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockDirConfig.closeRoute)
			.toHaveBeenCalledWith(mockReq, mockRes, {}, jasmine.any(Function));
	});	

	it('parent route is closed after being handled', function () {

		var childDirName = 'child';
		var mockGetConfig = initMockGetConfig(path.join(childDirName, 'get.js'));
        var mockDirConfig = initMockDirConfig(path.join(childDirName, 'route.js'));

		var mockParams = {};

        var parent = {
        	config: {
        		userConfig: {
					openRoute: function (req, res, params, done) {
						done(mockParams);
					},

        			closeRoute: jasmine.createSpy(),
        		},
        	},
        };

		testObject._processDirectory(initDir(childDirName, "", parent));

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(parent.config.userConfig.closeRoute)
			.toHaveBeenCalledWith(mockReq, mockRes, mockParams, jasmine.any(Function));
	});		

	it('params defined by parent are passed to route closer', function () {

		var childDirName = 'child';
		var mockGetConfig = initMockGetConfig(path.join(childDirName, 'get.js'));
        var mockDirConfig = initMockDirConfig(path.join(childDirName, 'route.js'));

		var mockParams = {};

        var parent = {
        	config: {
        		userConfig: {
					closeRoute: function (req, res, params, done) {
						done(mockParams);
					},
        		},
        	},
        };

		testObject._processDirectory(initDir(childDirName, "", parent));

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockDirConfig.closeRoute)
			.toHaveBeenCalledWith(mockReq, mockRes, mockParams, jasmine.any(Function));
	});			

});