const dgram = require("dgram");

/**
 * Constant for waiting for new messages from server
 * @constant
 */
const NET_WAIT = 1;

/**
 * Constant for closing connection
 * @constant
 */
const NET_CLOSE = 2;

/**
 * When network error occur
 * @constant
 */
const NET_ERROR = 3;


/**
 * A tool for managing network connections
 * 
 * @class
 */
class Network {
	/**
	 * @constructor
	 * @param {object} options 
	 */
	constructor(options = {}) {
		this.protocol = options.protocol ? options.protocol : "udp4";
		this.options = options;
		this.timeout = null;
		this.debug = false;

		this.address = this.port = this.client = null;
	}

	/**
	 * Connecting with the server
	 * @param {string} address ip address
	 * @param {number} port port
	 * @param {boolean} debug
	 */
	connect(address, port, debug) {
		this.debug = debug;
		this.address = address;
		this.port = port;

        if (this.debug) console.log("DEBUG: Connetcting to "+address+":"+port);
		return this;
	}

	/**
	 * Closing network connection
	 * @param {Function<Error>} cb callback
	 */
	close(cb) {
        if (this.debug) console.log("DEBUG: Closing UDP connection");
		if (!this.client) {
			cb("Connection already closed");
			return;
		}
		this.client.close(cb);
	}

	/**
	 * Sending payload to server and processing received data with handler
	 * 
	 * @param {Buffer} payload 
	 * @param {Function<Buffer, object>} handler 
	 * @returns {Promise<object>}
	 */
	send(payload, handler) {
		this.client = dgram.createSocket(this.protocol);

        if (this.debug) console.log("DEBUG: Send buffer to "+this.address+":"+this.port);

		if (this.address === null) 
			throw new Error("Network address is empty!");
		if (this.port === null)
			throw new Error("Network port is empty!");
		if (payload === null)
			throw new Error("Network payload is empty!");

		return new Promise((resolve, reject) => {
			let timeout;
			this.client.send(payload, this.port, this.address, err => {
				if (err) reject(err);
				timeout = setTimeout(() => {
					this.client.removeAllListeners("message");
					this.close(() => reject("ERROR: Server is offline"));
				}, 2000);				

				this.client.on("message", (message, rinfo) => {
					const { control, data, error } = handler(message, rinfo);
					switch (control) {
					case NET_WAIT:
						return;
					case NET_ERROR:
						if (this.debug) console.log("DEBUG: Error:", error);
					case NET_CLOSE:
						clearTimeout(timeout);
						this.client.removeAllListeners("message");
						this.close(() => resolve(data));
						break;
					}
				})
			})
		})
	}
}

module.exports = { Network, NET_WAIT, NET_CLOSE, NET_ERROR };