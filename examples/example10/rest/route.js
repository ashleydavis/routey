
module.exports = {

    openRoute: function (req, res, params, done) {

        params.text = "10th example!";
        done(params);
    },
};