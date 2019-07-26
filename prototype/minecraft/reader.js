const BufferCursor = require("../../buffer");
const constants = require("./consts");

class MinecraftBufferCursor extends BufferCursor {
	constructor() {
		super(null);
	}
	load(buffer) {
		this.buffer = buffer;
		this.cursor = 0;
		return this;
	}
	read() {
		let type = this.readByte(),
				data = {};

		this.skip(4);
		switch (type) {
			case 9: // Handshake
				let string = this.buffer.slice(5, this.buffer.length-1).toString();
				data = parseInt(string, 10);
				break;
			case 0:
				if (Buffer.compare(this.buffer.slice(5, 16), Buffer.from(constants["RES_PADDING_1"])) === 0) {
					data = this.fullstatDecoding();
				} else {
					data = this.basicstatDecoding();
				}
				break;
		}
		return data;
	}

	fullstatDecoding() {
		let data = {};
		this.skip(11);
		for (let i = 0; i < 10; i++)
			data[this.readString()] = this.readString();

		if (data.plugins.length > 0) {
			data.mod = "";
			let i = 0;
			while(data.plugins[i] !== ":") {
				data.mod += data.plugins[i];
				i++;
			}
			data.plugins = data.plugins.substr(i+2);
			data.plugins = data.plugins.split("; ");
		}

		this.skip(10);
		let num = 0, players = [];
		while(this.cursor <= this.buffer.length) {
			let name = this.readString();
			if (name === "") continue;
			players[num++] = name;
		}
		data.players_list = players;

		return data;
	}

	basicstatDecoding() {
		let data = {};
		data.MOTD = this.readString();
		data.gametype = this.readString();
		data.map = this.readString();
		data.numplayers = +this.readString();
		data.maxplayers = +this.readString();
		data.hostport = this.readShort();
		data.hostip = this.readString();

		return data;
	}
}

module.exports = MinecraftBufferCursor;