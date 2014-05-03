
module.exports = {

    openRoute: function (req, res, params, done) {
        params.text = "9th example!";
        done(params);
    },
};