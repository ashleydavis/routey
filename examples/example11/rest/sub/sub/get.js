
module.exports = {
    handler: function (req, res, params, done) {
        res.send(params.A + params.B + params.C);
        done();
    },
};