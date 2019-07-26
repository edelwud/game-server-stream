const fs = require("fs");
const path = require("path");

/**
 * Loads prototypes from folders
 * @class
 */
class Loader {
	constructor() {
		return this.getQueries();
	}

	/**
	 * Reads selected folder and load prototypes
	 */
	getQueries() {
		const folders = fs.readdirSync(path.resolve(__dirname, "prototype"));
		let gameQueries = {};
		for (const folder of folders) {
			gameQueries[folder] = require(path.resolve(__dirname, "prototype", folder));
		}
		return gameQueries;
	}
}

module.exports = Loader;