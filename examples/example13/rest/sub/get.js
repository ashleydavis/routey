
module.exports = function () {
	var privateVariable = "13th example!";

	return {
	    handler: function (req, res, params, done) {
	        res.send(privateVariable);
	        done();
	    },
	};
};