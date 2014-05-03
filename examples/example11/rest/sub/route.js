
module.exports = {

    openRoute: function (req, res, params, done) {

        params.B = ' example';
        done(params);
    },
};