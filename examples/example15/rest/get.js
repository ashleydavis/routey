
module.exports = {
	route: 'customized',

    handler: function (req, res, params, done) {
        res.send('15th example!');
        done();
    },
};