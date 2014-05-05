
module.exports = {
    handler: function (req, res, params, done) {
    	console.log(req.body);
        res.send(req.body);
        done();
    },
};