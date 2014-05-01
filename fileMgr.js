//
// Unit-testable wrapper for filesystem functions.
//

var path = require('path');
var fs = require('fs');

module.exports = {    

	//
	// Get a list of directories from the specified path.
	//
	getDirectories: function (dirPath) {

		var dirContents = fs.readdirSync(dirPath);
		return dirContents.filter(function (subDirName) {
			// Filter out non-directories.
			var subDirPath = path.join(dirPath, subDirName);
			return fs.lstatSync(subDirPath).isDirectory();
		});
	},

    //
    // Returns true if the specified file exists.
    //
    fileExists: function (filePath) {

        return fs.existsSync(filePath);
    },
};