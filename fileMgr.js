//
// Unit-testable wrapper for filesystem functions.
//

var fs = require('fs');

module.exports = {    
    //
    // Returns true if the specified file exists.
    //
    fileExists: function (filePath) {

        return fs.existsSync(filePath);
    },
};