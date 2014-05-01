var path = require('path');
var express = require('express');

var app = express();

var routey = require('../../routey');

routey({
    routeConfigPath: path.join(__dirname, "rest"),
    verbose: true,
}, app);

app.listen(3000);


