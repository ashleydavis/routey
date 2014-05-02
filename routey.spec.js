'use strict';

var mockery = require('mockery');

describe('routey', function () {
	var routey;
	var mockRouteyInit;

	beforeEach(function () {
		mockery.enable();

		mockRouteyInit = {
			_processDirectory: jasmine.createSpy(),
		};

		mockery.registerMock('./route_init', function () { return mockRouteyInit; });
		mockery.registerAllowable('./routey');
		mockery.registerAllowable('path');

		routey = require('./routey');
	});

	afterEach(function () {
		mockery.deregisterAllowable('./routey');
		mockery.deregisterAllowable('path');
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

		var config = {
			routeConfigPath: fullPath,
		};
		var app = {};

		routey(config, app);

		expect(mockRouteyInit._processDirectory).toHaveBeenCalledWith({
			name: childDir,
			path: fullPath,
			parentRoute: '/',
			isRoot: true,
		});
	});

});