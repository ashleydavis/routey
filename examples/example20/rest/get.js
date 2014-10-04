
module.exports = {

	// Example of customized query parameter.
	route: ':myparam?',

    handler: function (req, res, params) {
    	if (req.params.myparam) {
        	res.send(req.params.myparam);
        }
        else {
        	res.send('no param was specified');
        }
    },
};