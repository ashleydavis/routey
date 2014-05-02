'use strict';

var request = require('request');

describe('example6', function () {

	var restServer;

	beforeEach(function () {

		restServer = require('./server');
	});

	afterEach(function () {

		restServer.server.close();
	});

	it('can get correct value from rest server', function (done) {

		request('http://localhost:3000/customized1/customized2/customized3/', function (err, response, body) {

			expect(body).toBe('6th example!')

			done();
		});
	});

});

