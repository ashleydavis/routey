'use strict';

var request = require('request');

describe('example15', function () {

	var restServer;

	beforeEach(function () {

		restServer = require('./server');
	});

	afterEach(function () {

		restServer.server.close();
	});

	it('can get correct value from rest server', function (done) {

		var putData = { a: 1, b: "hello" };

		request.put({
			url: 'http://localhost:3000/', 
			json: putData,
		}, function (err, response, body) {

			expect(body).toEqual(putData);

			done();
		});
	});

});

