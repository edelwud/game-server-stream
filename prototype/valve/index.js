const { Network, NET_WAIT, NET_CLOSE, NET_ERROR } = require("../../net");
let { wrapper } = require("../../utils");

const ValveBufferCursor = require("./reader");

const net = new Network({ debug: true });
const bufferdecoder = new ValveBufferCursor();

/**
 * Formats of client -> server and server -> client interaction
 */
const Formats = {
    /** Client -> server interaction */
    A2S: {
        /** Configure */
        config() {
            let buffer = Buffer.alloc(this.length);
            buffer.writeInt32BE(-1, 0);
            buffer.writeInt8(this.header, 4);
            if (this.payload) buffer.write(this.payload, 5);
            else buffer.writeInt32BE(-1, 5);
            return buffer;
        },

        /** Format of getting info from server */
        INFO: {
            length: 25,
            header: 0x54,
            payload: "Source Engine Query",
            configure() {
                return Formats.A2S.config.bind(this)();
            }
        },

        /** Format of getting challenge from server */
        CHALLENGE_PLAYERS: {
            length: 9,
            header: 0x55,
            payload: null,
            configure() {
                return Formats.A2S.config.bind(this)();
            }
        },

        /** Format of getting challenge from server */
        CHALLENGE_RULES: {
            length: 9,
            header: 0x56,
            payload: null,
            configure() {
                return Formats.A2S.config.bind(this)();
            }
        },

        /** Format of getting players info from server */
        PLAYERS: {
            length: 5,
            header: 0x55,
            payload: null,
            configure(challenge) {
                let buffer = Buffer.alloc(this.length);
                buffer.writeInt32BE(-1, 0);
                buffer.writeInt8(this.header, 4);
                return Buffer.concat([buffer, challenge.slice(5)]);
            }
        },

        /** Format of getting rules info from server */
        RULES: {
            length: 5,
            header: 0x56,
            payload: null,
            configure(challenge) {
                let buffer = Buffer.alloc(this.length);
                buffer.writeInt32BE(-1, 0);
                buffer.writeInt8(this.header, 4);
                return Buffer.concat([buffer, challenge.slice(5)]);
            }
        }
    },
    /** Server -> client interaction */
    S2A: {
        INFO: [0x49, 0x6D], // General info header 
        PLAYERS: 0x44, // Players info header
        RULES: 0x45, // Rules info header
        CHALLENGE: 0x41 // Challenge header
    }
}

/**
 * Non-splitted packet
 * @constant
 */
const WHOLE_PACKET = -1;

/**
 * Splitted packet
 * @constant
 */
const SPLIT_PACKET = -2;

/**
 * Source server prototype
 * @class
 */
class Valve {
    /**
     * @async
     * @constructor
     * @param {object} server 
     * @param {object} options 
     * @returns {Promise<object>}
     */
	constructor(server, options = {}) {
        this.server = server;
        this.goldenSource = false;
        this.splitResponse = {};

        this.debug = options.debug || false;

        this.net = net.connect(this.server.address, this.server.port, this.debug);
        wrapper = wrapper.bind(this.net);

        return (async () => {
            let error, info, players_list, rules_list;
            ({ error, info } = await this.getServerInfo());
            if (error) {
                return { error };
            }

            ({ error, players_list } = await this.getPlayersList());
            if (error) {
                return { error, info };
            }

            ({ error, rules_list } = await this.getRulesList());
            if (error) {
                return { error, info, players_list };
            }

            if (this.debug) console.log("DEBUG: Server "+this.server.address+":"+this.server.port+" successfully processed");

            return { info, players: players_list, rules: rules_list };
        })()
    }
    
    /**
     * Getting general info from server
     * @async
     * @returns {Promise<object>}
     */
    async getServerInfo() {
        if (this.debug) console.log("DEBUG: Getting server info");

        const info_payload = Formats.A2S.INFO.configure();        
        const { error, value } = await wrapper(this.net.send, info_payload, (buffer, rinfo) => {
            if (rinfo.address !== this.server.address || rinfo.port !== this.server.port) {
                return { control: NET_WAIT };
            }

            const reader = bufferdecoder.load(buffer);

            const header = reader.readLong();
            const method = reader.readByte();

            if (Formats.S2A.INFO.indexOf(method) !== 0) {
                return { control: NET_WAIT };
            }

            if (header === WHOLE_PACKET) {
                if (this.debug) console.log("DEBUG: Getting message from "+rinfo.address+":"+rinfo.port);

                const data = bufferdecoder.load(buffer).decode();
                this.goldenSource = (data.protocol === 48 || 
                                     data.protocol === 47) ? true : false;
                return { control: NET_CLOSE, data };
            }

            return { control: NET_ERROR, error: "ERROR: Damaged message header" };
        });

        if (error) {
            return { error };
        }

        return { error, info: value };
    }

    /**
     * Getting players info from server
     * @async
     * @returns {Promise<object>}
     */
    async getPlayersList() {
        if (this.debug) console.log("DEBUG: Getting players challenge");

        const challenge_payload = Formats.A2S.CHALLENGE_PLAYERS.configure();        
        let { error, value } = await wrapper(this.net.send, challenge_payload, (buffer, rinfo) => {
            if (rinfo.address !== this.server.address || rinfo.port !== this.server.port) {
                return { control: NET_WAIT };
            }

            const reader = bufferdecoder.load(buffer);

            const header = reader.readLong();
            const method = reader.readByte();

            if (Formats.S2A.CHALLENGE !== method) {
                return { control: NET_WAIT };
            }

            if (header !== SPLIT_PACKET && header !== WHOLE_PACKET) {
                return { control: NET_ERROR, error: "ERROR: Damaged message header" };
            }

            if (this.debug) console.log("DEBUG: Challenge "+buffer.toString("hex")+" from "+rinfo.address+":"+rinfo.port);

            return { control: NET_CLOSE, data: buffer };
        });

        if (this.debug) console.log("DEBUG: Getting players list");

        const players_payload = Formats.A2S.PLAYERS.configure(value);
        ({ error, value } = await wrapper(this.net.send, players_payload, (buffer, rinfo) => {
            if (rinfo.address !== this.server.address || rinfo.port !== this.server.port) {
                return { control: NET_WAIT };
            }

            const reader = bufferdecoder.load(buffer);
            const header = reader.readLong();

            if (header === WHOLE_PACKET) {
                if (this.debug) console.log("DEBUG: Single-packet buffer detected, message from "+rinfo.address+":"+rinfo.port);

                const method = reader.readByte();

                if (Formats.S2A.PLAYERS !== method) {
                    return { control: NET_WAIT };
                }

                const data = bufferdecoder.load(buffer).decode();
                return { control: NET_CLOSE, data };
            }

            if (header === SPLIT_PACKET) {
                let total, current, id = reader.readLong();

                if (this.goldenSource) {
                    const packets = reader.readByte();
                    total = packets & 0x0f;
                    current = (packets & 0xf0) >> 4;

                    if (!this.splitResponse[id]) this.splitResponse[id] = [];
                    this.splitResponse[id][current] = reader.unload();
                } else {
                    const compressed = reader.readByte() === 1 ? true : false;
                    reader.cursor--;

                    total = reader.readByte();
                    current = reader.readByte();
                    const size = reader.readShort();

                    /** GZIP2 compression (unrealised now) */
                    if (!current && compressed) {
                        console.log("GZIP2")
                        const fullSize = reader.readLong();
                        const checksum = reader.readLong();

                        return { control: NET_ERROR, error: "ERROR: GZIP2 encoded buffer not allowed" };
                    }

                    if (!this.splitResponse[id]) this.splitResponse[id] = [];
                    this.splitResponse[id][current] = reader.unload();
                }

                if (this.debug) console.log("DEBUG: Split package players "+rinfo.address+":"+rinfo.port+" packet "+(current+1)+"/"+total);

                if (Object.keys(this.splitResponse[id]).length !== total) {
                    return { control: NET_WAIT };
                } else {
                    let result = Buffer.from([]);
                    for (let i = 0; i < total; i++) {
                        if (!(i in this.splitResponse[id])) {
                            return { control: NET_ERROR, error: "ERROR: Buffer missed" };
                        }
                        result = Buffer.concat([result, this.splitResponse[id][i]]);
                    }

                    const data = bufferdecoder.load(result).decode();
                    return { control: NET_CLOSE, data };
                }
            }
        }));

        if (error) {
            return { error };
        }

        return { error, players_list: value };
    }

    /**
     * Getting rules info from server
     * @async
     * @returns {Promise<object>}
     */
    async getRulesList() {
        if (this.debug) console.log("DEBUG: Getting rules challenge");

        const challenge_payload = Formats.A2S.CHALLENGE_PLAYERS.configure();        
        let { error, value } = await wrapper(this.net.send, challenge_payload, (buffer, rinfo) => {
            if (rinfo.address !== this.server.address || rinfo.port !== this.server.port) {
                return { control: NET_WAIT };
            }

            const reader = bufferdecoder.load(buffer);

            const header = reader.readLong();
            const method = reader.readByte();

            if (Formats.S2A.CHALLENGE !== method) {
                return { control: NET_WAIT };
            }

            if (header !== SPLIT_PACKET && header !== WHOLE_PACKET) {
                return { control: NET_ERROR, error: "ERROR: Damaged message header" };
            }

            if (this.debug) console.log("DEBUG: Challenge "+buffer.toString("hex")+" from "+rinfo.address+":"+rinfo.port);

            return { control: NET_CLOSE, data: buffer };
        });

        if (this.debug) console.log("DEBUG: Getting rules list");

        const rules_payload = Formats.A2S.RULES.configure(value);
        ({ error, value } = await wrapper(this.net.send, rules_payload, (buffer, rinfo) => {
            if (rinfo.address !== this.server.address || rinfo.port !== this.server.port) {
                return { control: NET_WAIT };
            }

            const reader = bufferdecoder.load(buffer);
            const header = reader.readLong();

            if (header === WHOLE_PACKET) {
                if (this.debug) console.log("DEBUG: Single-packet buffer detected, message from "+rinfo.address+":"+rinfo.port);
                const method = reader.readByte();

                if (Formats.S2A.RULES !== method) {
                    return { control: NET_WAIT };
                }

                const data = bufferdecoder.load(buffer).decode();
                return { control: NET_CLOSE, data };
            }

            if (header === SPLIT_PACKET) {
                let total, current, id = reader.readLong();

                if (this.goldenSource) {
                    const packets = reader.readByte();
                    total = packets & 0x0f;
                    current = (packets & 0xf0) >> 4;

                    if (!this.splitResponse[id]) this.splitResponse[id] = [];
                    this.splitResponse[id][current] = reader.unload();
                } else {
                    const compressed = reader.readByte() === 1 ? true : false;
                    reader.cursor--;

                    total = reader.readByte();
                    current = reader.readByte();
                    const size = reader.readShort();

                    /** GZIP2 compression (unrealised now) */
                    if (!current && compressed) {
                        console.log("GZIP2")
                        const fullSize = reader.readLong();
                        const checksum = reader.readLong();
                    }

                    if (!this.splitResponse[id]) this.splitResponse[id] = [];
                    this.splitResponse[id][current] = reader.unload();
                }

                if (this.debug) console.log("DEBUG: Split package rules "+rinfo.address+":"+rinfo.port+" packet "+(current+1)+"/"+total);

                if (Object.keys(this.splitResponse[id]).length !== total) {
                    return { control: NET_WAIT, data: null };
                } else {
                    let result = Buffer.from([]);
                    for (let i = 0; i < total; i++) {
                        if (!(i in this.splitResponse[id])) {
                            return { control: NET_ERROR, error: "ERROR: Buffer missed" };
                        }
                        result = Buffer.concat([result, this.splitResponse[id][i]]);
                    }

                    const data = bufferdecoder.load(result).decode();
                    return { control: NET_CLOSE, data };
                }
            }
        }));

        if (error) {
            return { error };
        }

        return { error, rules_list: value };
    }
}

module.exports = Valve;