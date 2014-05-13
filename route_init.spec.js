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
			handler: function (req, res, params) {
				return params;
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
			openRoute: function (req, res, params) {
			},
			
			closeRoute: function (req, res, params) {
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
			.toHaveBeenCalledWith(mockReq, mockRes, {}, jasmine.any(Object))
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
			.toHaveBeenCalledWith(mockReq, mockRes, handlerParams, jasmine.any(Object))
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
			.toHaveBeenCalledWith(mockReq, mockRes, {}, jasmine.any(Object))
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

	it('route URL can be customized', function () {

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
			.toHaveBeenCalledWith(mockReq, mockRes, {}, jasmine.any(Object));
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
			.toHaveBeenCalledWith(mockReq, mockRes, {}, jasmine.any(Object))
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
			.toHaveBeenCalledWith(mockReq, mockRes, {}, jasmine.any(Object))
	});	

	it('handler is not invoked until async open has completed', function () {

		var childDirName = 'child';
		var mockGetConfig = initMockGetConfig(path.join(childDirName, 'get.js'));
        var mockDirConfig = initMockDirConfig(path.join(childDirName, 'route.js'));

        var done;
        var openParams;
        mockDirConfig.openRoute = function (req, res, params, async) {
        	done = async.start();
        	openParams = params;
        };

		testObject._processDirectory(initDir(childDirName));

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		// The async operation hasn't completed, the handler shouldn't have been called yet.
		expect(mockGetConfig.handler).not.toHaveBeenCalled();

		// Complete the async operation.
		done(openParams);

		// Now that we have faked completion of the async operation, the handler should have been called.
		expect(mockGetConfig.handler).toHaveBeenCalled();
	});

	it('sub-route is not opened until async parent open has completed', function () {

		var dirName = 'child';
		var mockDirConfig = initMockDirConfig(path.join(dirName, 'route.js'));
		var mockGetConfig = initMockGetConfig(path.join(dirName, 'get.js'));

        var done;
        var openParams;

		var parent = {
			config: {
					userConfig: {
						openRoute: function (req, res, params, async) {
							done = async.start();
							openParams = params;
						},
					},
				},			
		};

		testObject._processDirectory(initDir(dirName, "", parent));

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockDirConfig.openRoute).not.toHaveBeenCalled();

		done(openParams); // Complete the async operation.

		expect(mockDirConfig.openRoute).toHaveBeenCalled();
	});

	it('route is not closed until async handler has completed', function () {

		var childDirName = 'child';
		var mockGetConfig = initMockGetConfig(path.join(childDirName, 'get.js'));
        var mockDirConfig = initMockDirConfig(path.join(childDirName, 'route.js'));

        var done;

        mockGetConfig.handler = function (req, res, params, async) {
        	done = async.start();
        };

		testObject._processDirectory(initDir(childDirName));

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockDirConfig.closeRoute).not.toHaveBeenCalled();

		done(); // Complete the async operation.

		expect(mockDirConfig.closeRoute).toHaveBeenCalled();
	});

	it('parent route is not closed until async child close has completed', function () {

		var dirName = 'child';
		var mockDirConfig = initMockDirConfig(path.join(dirName, 'route.js'));
		var mockGetConfig = initMockGetConfig(path.join(dirName, 'get.js'));

        var done;

        mockDirConfig.closeRoute = function (req, res, params, async) {
        	done = async.start();
        };

        var done;

		var parent = {
			config: {
					userConfig: {
						closeRoute: jasmine.createSpy(),
					},
				},			
		};

		testObject._processDirectory(initDir(dirName, "", parent));

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(parent.config.userConfig.closeRoute).not.toHaveBeenCalled();

		done(); // Complete the async operation.

		expect(parent.config.userConfig.closeRoute).toHaveBeenCalled();
	});

	it('params from route open are passed to route handler', function () {

		var childDirName = 'child';
		var parentDirName = 'parent';
		var mockGetConfig = initMockGetConfig(path.join(parentDirName, childDirName, 'get.js'));
        var mockDirConfig = initMockDirConfig(path.join(parentDirName, childDirName, 'route.js'));

        var mockParams = {};

        mockDirConfig.openRoute = function (req, res, params, done)  {
        	return mockParams;
        };

		testObject._processDirectory(initDir(childDirName, parentDirName));

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockGetConfig.handler)
			.toHaveBeenCalledWith(mockReq, mockRes, mockParams, jasmine.any(Object));
	});

	it('async params from route open are passed to route handler', function () {

		var childDirName = 'child';
		var parentDirName = 'parent';
		var mockGetConfig = initMockGetConfig(path.join(parentDirName, childDirName, 'get.js'));
        var mockDirConfig = initMockDirConfig(path.join(parentDirName, childDirName, 'route.js'));

        var mockParams = {};

        mockDirConfig.openRoute = function (req, res, params, async)  {
        	var done = async.start();
        	done(mockParams);
        };

		testObject._processDirectory(initDir(childDirName, parentDirName));

		var handler = mockApp.get.mostRecentCall.args[1];

		// Simulate a request.
		var mockReq = {};
		var mockRes = {};
		handler(mockReq, mockRes);

		expect(mockGetConfig.handler)
			.toHaveBeenCalledWith(mockReq, mockRes, mockParams, jasmine.any(Object));
	});

	it('params are passed to child route opener', function () {

		var childDirName = 'child';
		var parentDirName = 'parent';
		var mockDirConfig = initMockDirConfig(path.join(parentDirName, childDirName, 'route.js'));
		var mockGetConfig = initMockGetConfig(path.join(parentDirName, childDirName, 'get.js'));

		var mockParams = {};
		testObject._processDirectory(initDir(childDirName, parentDirName, {
			config: {
				userConfig: {
					openRoute: function (req, res, params) {
						return mockParams;
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
			.toHaveBeenCalledWith(mockReq, mockRes, mockParams, jasmine.any(Object))
	});	

	it('async params are passed to child route opener', function () {

		var childDirName = 'child';
		var parentDirName = 'parent';
		var mockDirConfig = initMockDirConfig(path.join(parentDirName, childDirName, 'route.js'));
		var mockGetConfig = initMockGetConfig(path.join(parentDirName, childDirName, 'get.js'));

		var mockParams = {};
		testObject._processDirectory(initDir(childDirName, parentDirName, {
			config: {
				userConfig: {
					openRoute: function (req, res, params, async) {
						var done = async.start();
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
			.toHaveBeenCalledWith(mockReq, mockRes, mockParams, jasmine.any(Object))
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
			.toHaveBeenCalledWith(mockReq, mockRes, {}, jasmine.any(Object));
	});	

	it('parent route is closed after being handled', function () {

		var childDirName = 'child';
		var mockGetConfig = initMockGetConfig(path.join(childDirName, 'get.js'));
        var mockDirConfig = initMockDirConfig(path.join(childDirName, 'route.js'));

		var mockParams = {};

        var parent = {
        	config: {
        		userConfig: {
					openRoute: function (req, res, params) {
						return mockParams;
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
			.toHaveBeenCalledWith(mockReq, mockRes, mockParams, jasmine.any(Object));
	});		

	it('params defined by parent are passed to route closer', function () {

		var childDirName = 'child';
		var mockGetConfig = initMockGetConfig(path.join(childDirName, 'get.js'));
        var mockDirConfig = initMockDirConfig(path.join(childDirName, 'route.js'));

		var mockParams = {};

        var parent = {
        	config: {
        		userConfig: {
					closeRoute: function (req, res, params) {
						return mockParams;
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
			.toHaveBeenCalledWith(mockReq, mockRes, mockParams, jasmine.any(Object));
	});			

	it('parent route is closed after parent route is async opened', function () {

		var childDirName = 'child';
		var mockGetConfig = initMockGetConfig(path.join(childDirName, 'get.js'));
        var mockDirConfig = initMockDirConfig(path.join(childDirName, 'route.js'));

		var mockParams = {};

        var parent = {
        	config: {
        		userConfig: {
					openRoute: function (req, res, params, async) {
						var done = async.start();
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
			.toHaveBeenCalledWith(mockReq, mockRes, mockParams, jasmine.any(Object));
	});		

});