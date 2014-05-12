'use strict';

var mockery = require('mockery');
var path = require('path');

describe('routey', function () {
	var routey;
	var mockRouteyInit;
	var mockPath;

	beforeEach(function () {
		mockery.enable();

		mockRouteyInit = {
			_processDirectory: jasmine.createSpy(),
		};

		mockPath = {
			join: path.join,
			basename: path.basename,

			resolve: function (path) {
				return path;
			},
		};

		mockery.registerMock('./route_init', function () { return mockRouteyInit; });
		mockery.registerMock('path', mockPath);
		mockery.registerAllowable('./routey');

		routey = require('./routey');
	});

	afterEach(function () {
		mockery.deregisterAllowable('./routey');
		mockery.deregisterMock('path');
		mockery.deregisterMock('./route_init');

		mockery.disable();
	});

	it('undefined config throws exception', function () {

		expect(function () {
			routey();
			
		}).toThrow();
	});

	it('unspecified route config path throws exception', function () {

		var config = {};
		var app = {};

		expect(function () {
			routey(config, app);

		}).toThrow();
	});

	it('undefined app throws exception', function () {

		var config = {};

		expect(function () {
			routey(config);
			
		}).toThrow();
	});

	it('external interface calls through to route init', function () {

		var parentDir = 'parent';
		var childDir = 'child';
		var fullPath = parentDir + '/' + childDir;
		var parentRoute = '/myparent';
		var handlerParams = {};

		var config = {
			routeConfigPath: fullPath,
			parentRoute: parentRoute,
			handlerParams: handlerParams,
		};
		var app = {};

		routey(config, app);

		expect(mockRouteyInit._processDirectory).toHaveBeenCalledWith({
			name: childDir,
			path: fullPath,
			parentRoute: parentRoute,
			config: {},
			parent: null,
			handlerParams: handlerParams,
		});
	});

	it('parent route is defaulted when not specified', function () {

		var parentDir = 'parent';
		var childDir = 'child';
		var fullPath = parentDir + '/' + childDir;

		var config = {
			routeConfigPath: fullPath,
		};
		var app = {};

		routey(config, app);

		expect(mockRouteyInit._processDirectory).toHaveBeenCalledWith({
			name: childDir,
			path: fullPath,
			parentRoute: '/',
			config: {},
			parent: null,
			handlerParams: {},
		});
	});

	it('full path to rest config directory is resolved', function () {

		var inputPath = 'whatever';

		var config = {
			routeConfigPath: inputPath,
		};

		var parentDir = 'parent';
		var childDir = 'child';
		var resolvedPath = parentDir + '/' + childDir;
		mockPath.resolve = function () {
			return resolvedPath;
		};

		var app = {};

		routey(config, app);

		expect(mockRouteyInit._processDirectory).toHaveBeenCalledWith({
			name: childDir,
			path: resolvedPath,
			parentRoute: '/',
			config: {},
			parent: null,
			handlerParams: {},
		});
	});
});