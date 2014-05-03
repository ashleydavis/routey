
module.exports = {

    openRoute: function (req, res, params, done) {

        params.C = '!';
        done(params);
    },
};