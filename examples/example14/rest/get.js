
module.exports = {
    handler: function (req, res, params) {
        res.send(params.handlerArgument);
    },
};