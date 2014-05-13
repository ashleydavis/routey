
module.exports = {
    handler: function (req, res, params) {
        res.send(params.A + params.B + params.C);
    },
};