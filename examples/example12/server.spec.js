'use strict';

var request = require('request');

describe('example12', function () {

	var restServer;

	beforeEach(function () {

		restServer = require('./server');
	});

	afterEach(function () {

		restServer.server.close();
	});

	it('can get back value that was posted to server', function (done) {

		var postData = { a: 1, b: "hello" };

		request.post({
			url: 'http://localhost:3000/', 
			json: postData,
		}, function (err, response, body) {

			console.log(body);

			expect(body).toEqual(postData);

			done();
		});
	});

});

