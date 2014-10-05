
module.exports = {
    handler: function (req, res, params) {
        res.send(req.query.someparam);
    },
};