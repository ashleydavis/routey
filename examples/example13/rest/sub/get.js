
module.exports = function () {
	var privateVariable = "13th example!";

	return {
	    handler: function (req, res, params) {
	        res.send(privateVariable);
	    },
	};
};