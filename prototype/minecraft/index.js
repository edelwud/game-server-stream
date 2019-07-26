const { Network, NET_WAIT, NET_CLOSE, NET_ERROR } = require("../../net");
const MinecraftBufferReader = require("./reader");
let { wrapper } = require("../../utils");

let net = new Network("udp4");
let reader = new MinecraftBufferReader();

const Formats = {
	C2S: {
		Magic: 0xFEFD,
		Padding: 0,
		Type: {
			handshake: 9,
			stat: 0,
		},
		handshake(sessionId) {
			const packet = Buffer.alloc(7);
			packet.writeUInt16BE(Formats.C2S.Magic);
			packet.writeUInt8(Formats.C2S.Type.handshake, 2);
			packet.writeUInt32BE(sessionId, 3);
			return packet;
		},
		basicstat(sessionId, token) {
			const packet = Buffer.alloc(11);
			packet.writeUInt16BE(Formats.C2S.Magic, 0);
			packet.writeUInt8(Formats.C2S.Type.stat, 2);
			packet.writeUInt32BE(sessionId, 3);
			packet.writeUInt32BE(token, 7);
			return packet;
		},
		fullstat(sessionId, token) {
			const packet = Buffer.alloc(15);
			packet.writeUInt16BE(Formats.C2S.Magic, 0);
			packet.writeUInt8(Formats.C2S.Type.stat, 2);
			packet.writeUInt32BE(sessionId, 3);
			packet.writeUInt32BE(token, 7);
			packet.writeUInt32BE(Formats.C2S.Padding, 11);
			return packet;
		}
	},
	S2C: {
		Type: {
			handshake: 9,
			stat: 0,
		},
	},
}

/**
 * Minecraft prototype
 * @class
 */
class Minecraft {
	/**
	 * @constructor
	 * @param {object} server requested server 
	 * @returns {Promise<array>}
	 */
	constructor(server) {
		this.server = server;
		this.token;

		this.net = net.connect(this.server.address, this.server.port, this.debug);
		this.net.sessionId = this.generateSssionId();
        wrapper = wrapper.bind(this.net);

		return this.init();
	}

	/**
	 * Initialization
	 * 
	 * @async
	 * @returns {Promise<array>}
	 */
	async init() {
		let error,
			basicstat,
			fullstat;
		
		error = await this.getHandshakeToken();
		if (error) {
			return { error }
		}

		({ error, basicstat } = await this.getBasicstat());
		if (error) {
			return { error }
		}

		({ error, fullstat } = await this.getFullstat());
		if (error) {
			return { error, basicstat }
		}

		return { error, basicstat, fullstat };
	}

	async getHandshakeToken() {
		const handshakePayload = Formats.C2S.handshake(this.net.sessionId);

		console.log(handshakePayload);

		const { error, value } = await wrapper(this.net.send, handshakePayload, (buffer, rinfo) => {
			console.log("Cauched:", buffer)

			if (buffer.readInt32BE(1) !== this.sessionId) {
				return { control: NET_WAIT };
			}
			const token = reader.load(buffer)
								.read();
			
			return { control: NET_CLOSE, data: token };
		});

		this.token = value;

		return error;
	}

	async getBasicstat() {
		const basicstatPayload = Formats.C2S.basicstat(this.net.sessionId, this.token);
		const { error, value } = await wrapper(this.net.send, basicstatPayload, (buffer, rinfo) => {
			if (buffer.readInt32BE(1) !== this.sessionId) {
				return { control: NET_WAIT };
			}
			const token = reader.load(buffer)
								.read();
			
			return { control: NET_CLOSE, data: token };
		});

		return { error, basicstat: value }
	}

	async getFullstat() {
		const fullstatPayload = Formats.C2S.basicstat(this.net.sessionId, this.token);
		const { error, value } = await wrapper(this.net.send, fullstatPayload, (buffer, rinfo) => {
			if (buffer.readInt32BE(1) !== this.sessionId) {
				return { control: NET_WAIT };
			}
			const token = reader.load(buffer)
								.read();
			
			return { control: NET_CLOSE, data: token };
		});

		return { error, fullstat: value }
	}


	/**
	 * Generating session id randomly
	 * @returns {number}
	 */
	generateSssionId() {
		return this.getRandomInt(1, Math.pow(2, 32)) & 0x0F0F0F0F;
	}

	/**
	 * Getting random int
	 * @param {number} min 
	 * @param {number} max 
	 */
	getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min)) + min;
	}
}

module.exports = Minecraft;