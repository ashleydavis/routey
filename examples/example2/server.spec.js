'use strict';

var request = require('request');

describe('example2', function () {

	var restServer;

	beforeEach(function () {

		restServer = require('./server');
	});

	afterEach(function () {

		restServer.server.close();
	});

	it('can get correct value from rest server', function (done) {

		request('http://localhost:3000/sub/', function (err, response, body) {

			expect(body).toBe('2nd example!')

			done();
		});
	});

});

