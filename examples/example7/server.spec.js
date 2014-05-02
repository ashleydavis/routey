'use strict';

var request = require('request');

describe('example7', function () {

	var restServer;

	beforeEach(function () {

		restServer = require('./server');
	});

	afterEach(function () {

		restServer.server.close();
	});

	it('can get correct value from rest server', function (done) {

		request('http://localhost:3000/sub1/', function (err, response, body) {

			expect(body).toBe('7th example - sub1')

			request('http://localhost:3000/sub2/', function (err, response, body) {

				expect(body).toBe('7th example - sub2')

				done();
			});
		});
	});

});

