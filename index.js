const { Transform } = require("stream");
const Loader = require("./loader");
const gamesSupported = require("./games");

/**
 * A tool for getting and recognizing info from game servers via stream
 * 
 * @class
 * @extends Transform
 * @module game-server-stream
 * 
 * @version 1.0.0
 * @author edelwud <edelwud@icloud.com>
 */
class GameServerStream extends Transform {
	/**
	 * Loading necessary options and game prototypes
	 * @param {object} options
	 */
	constructor(options = {}) {
		options.objectMode = true; /** Enables put objects into .write() function */

		super(options);
		this.debug = options.debug || false;
		this.games = new Loader();
		this.server = {};
	}

	/**
	 * Getting info from server added in queue
	 * 
	 * @async
	 * @returns {Promise<object>} data from server
	 */
	async get() {
		const gamePrototype = gamesSupported[this.server.game].prototype;
		if (!gamePrototype) {
			return { error: new Error(`The game "${this.server.game}" is not supported now!`) };
		}
		const gameQuery = this.games[gamePrototype];
		const server = await new gameQuery(this.server, { debug: this.debug });
		return server;
	}

	/**
	 * Getting and processing result
	 */
	async _transform(chunk, _, done) {
		if (typeof chunk === "string") this.server = JSON.parse(chunk.toString());
		else this.server = chunk;

		const serverData = await this.get();
		done(null, JSON.stringify(serverData));
	}
}

module.exports = GameServerStream;