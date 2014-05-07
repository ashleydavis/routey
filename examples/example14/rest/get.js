
module.exports = {
    handler: function (req, res, params, done) {
        res.send(params.handlerArgument);
        done();
    },
};