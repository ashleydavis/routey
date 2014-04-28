'use strict';

var mockery = require('mockery');

describe('routey', function () {
	var routey;
	var routeyInitMock;

	beforeEach(function () {
		mockery.enable();

		routeyInitMock = jasmine.createSpy();

		mockery.registerMock('./route_init', routeyInitMock);
		mockery.registerAllowable('./routey');

		routey = require('./routey');
	});

	afterEach(function () {
		mockery.deregisterAllowable('./routey');
		mockery.deregisterMock('./route_init');

		mockery.disable();
	});


	it('external interface calls through to route init', function () {

		var config = {};
		var app = {};

		routey(config, app);

		expect(routeyInitMock).toHaveBeenCalledWith(config, app);		
	});

});