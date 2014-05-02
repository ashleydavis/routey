'use strict';

var request = require('request');

describe('example4', function () {

	var restServer;

	beforeEach(function () {

		restServer = require('./server');
	});

	afterEach(function () {

		restServer.server.close();
	});

	it('can get correct value from rest server', function (done) {

		request('http://localhost:3000/customized/', function (err, response, body) {

			expect(body).toBe('4th example!')

			done();
		});
	});

});

