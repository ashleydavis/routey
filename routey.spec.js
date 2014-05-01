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
			routePath: '/',
		});
	});

});