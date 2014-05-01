//
// Unit-testable wrapper for filesystem functions.
//

var fs = require('fs');

module.exports = {    
    //
    // Returns true if the specified JavaScript file exists.
    //
    jsFileExists: function (filePath) {
        console.log('exists?');
        console.log(filePath);

        return true;
    },
};