
module.exports = {

    openRoute: function (req, res, params, done) {

        params.A = '11th';
        done(params);
    },
};