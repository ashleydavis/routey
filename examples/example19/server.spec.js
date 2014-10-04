'use strict';

var request = require('request');

describe('example1', function () {

	var restServer;

	beforeEach(function () {

		restServer = require('./server');
	});

	afterEach(function () {

		restServer.server.close();
	});

	it('can get correct value from rest server', function (done) {

		var param = "foos";

		request('http://localhost:3000/' + param, function (err, response, body) {

			expect(body).toBe(param)

			done();
		});
	});

});

