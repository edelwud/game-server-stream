const BufferCursor = require("../../buffer");

/**
 * A tool for reading source server response
 * @class
 * @extends BufferCursor
 */
class ValveBufferCursor extends BufferCursor {
	/**
	 * @constructor
	 * @param {object} options 
	 */
	constructor(options = {}) { // load options
		super(null, {});
	}

	/**
	 * Loading buffer for reading
	 * @param {BUffer} buffer 
	 */
	load(buffer) {
		if (buffer === null) throw new Error("Buffer can not be empty!");
		this.buffer = buffer;
		this.cursor = 0;
		return this;
	}

	/**
	 * Unload unread buffer
	 * @returns {Buffer}
	 */
	unload() {
		return this.buffer.slice(this.cursor);
	}

	/**
	 * Decoding source server response
	 * @returns {Object}
	 */
	decode() {
		this.readLong();

		let data = {};
		this.header = this.readByte();
		switch (this.header) {
		case 0x49: // General info header simple server
			data = this.readServerInfo(false);
			break;
		case 0x6D: // General info header GoldenSource server
			data = this.readServerInfo(true);
			break;
		case 0x44: // Players info header
			data = this.readServerPlayers();
			break;
		case 0x41: // Challenge header
			data = this.readChallangeNumber();
			break;
		case 0x45: // Rules info header
			data = this.readServerRules();
			break;
		default: // Error catching
			return { err: new Error("Unknown response header!") };
		}

		return data;		
	}

	/**
	 * Reading source server rules info from loaded buffer
	 * @returns {Buffer}
	 */
	readServerRules() {
		let data = {};

		data.rules_count = this.readShort();
		data.rules = [];

		while (this.buffer[this.cursor] !== undefined) {
			let rule = {
				name: this.readString(),
				value: this.readString(),
			}
			if (rule.name !== "") data.rules.push(rule);
		}

		return data;
	}

	/**
	 * Reading source server players info from loaded buffer
	 * @returns {Buffer}
	 */
	readServerPlayers() {
		let data = {};

		data.players_num = this.readByte();
		data.players = [];

		let players_num = data.players_num;

		while (players_num) {
			this.cursor++;
			let player = {
				name: this.readString(),
				score: this.readLong(),
				time: Math.round(this.readFloat())
			}
			if (player.name !== "") data.players.push(player);
			players_num--;
		}

		return data;
	}

	/**
	 * Reading source server challenge from loaded buffer
	 * @returns {Buffer}
	 */
	readChallangeNumber() {
		this.buffer = this.buffer.slice(1);
		let data = this.buffer;
		return data;
	}

	/**
	 * Reading source server general info from loaded buffer
	 * @returns {Buffer}
	 */
	readServerInfo(gldnsrc) {
		let data = {}; // var where we save server info

		data.goldensource = gldnsrc;
		data.header = this.header;
		if (gldnsrc === true) {
			data.address = this.readString();
		} else {
			data.protocol = this.readByte();
		}
		data.hostname = this.readString();
		data.map = this.readString();
		data.folder = this.readString();
		data.game = this.readString();
		if (gldnsrc !== true) data.steamappID = this.readShort();
		data.players = this.readByte();
		data.max_players = this.readByte();
		if (gldnsrc !== true) data.bots = this.readByte();
		if (gldnsrc === true) data.protocol = this.readByte();
		data.sever_type = String.fromCharCode(this.readByte());
		data.env = String.fromCharCode(this.readByte());
		data.visibility = this.readByte();
		if (gldnsrc !== true) data.vac = this.readByte();
		if (gldnsrc === true) {
			data.mod = this.readByte();
			if (data.mod === 1) {
				data.mod = {};
				data.mod.link = this.readString();
				data.mod.dowload_link = this.readString();
				this.cursor++;
				data.mod.version = this.readLong();
				data.mod.size = this.readLong();
				data.mod.type = this.readByte();
				data.mod.dll = this.readByte();
			}
		}
		if (gldnsrc === true) {
			data.vac = this.readByte();
			data.bots = this.readByte();
		} else {
			data.version = this.readString();
			data.edf = this.readByte();

			if (data.edf & 0x80) data.port = this.readShort();
			if (data.edf & 0x10) data.steamID = this.readLongLong();
			if (data.edf & 0x40) {
				data.port = this.readShort();
				data.name = this.readString();
			}
			if (data.edf & 0x20) data.keywords = this.readString();
			if (data.edf & 0x01) data.gameID = this.readLongLong();
		}

		return data;
	}
}

module.exports = ValveBufferCursor;