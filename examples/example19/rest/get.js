
module.exports = {

	// Example of customized query parameter.
	route: ':myparam',

    handler: function (req, res, params) {
        res.send(req.params.myparam);
    },
};