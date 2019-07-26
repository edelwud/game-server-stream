const { Network, NET_WAIT, NET_CLOSE, NET_ERROR } = require("../../net");
const BufferCursor = require("../../buffer");
let { wrapper } = require("../../utils");

const net = new Network({ debug: true });

/**
 * Formats of client -> server and server -> client interaction
 */
const Formats = {
    /** Client -> server interaction */
    C2S: {
        /** Operation codes */
        opcode: {
            info: "i",
            rules: "r",
            players: "c",
            detailPlayers: "d",
            rcon: "x",
            ping: "p",
        },
        /** Configure request packet */
        prepare(opcode, address, port) {
            const packet = Buffer.alloc(11);

            let counter = 0;

            packet.writeUInt8("S".charCodeAt(), counter++);
            packet.writeUInt8("A".charCodeAt(), counter++);
            packet.writeUInt8("M".charCodeAt(), counter++);
            packet.writeUInt8("P".charCodeAt(), counter++);

            const addressParts = address.split(".");
            for (const part of addressParts) {
                packet.writeUInt8(+part, counter++);
            }

            packet.writeUInt8(port & 0xFF, counter++);
            packet.writeUInt8(port >> 8 & 0xFF, counter++);      
            
            packet.writeUInt8(opcode.charCodeAt(), counter++);                        

            return packet;
        }
    },
    /** Server -> client interaction */
    S2C: {
        extract_info(buffer) {
            const reader = new BufferCursor(buffer.slice(11));
            const data = {};
            data.password = reader.readByte();
            data.players = reader.readShort();
            data.max_players = reader.readShort();

            const hostnameLength = reader.readLong();
            data.hostname = reader.readConstString(hostnameLength, "ascii")
            
            const gamemodeLength = reader.readLong();
            data.gamemode = reader.readConstString(gamemodeLength, "ascii");

            const languageLength = reader.readLong();
            data.language = reader.readConstString(languageLength, "ascii");
            
            return data;
        },
        extract_players(buffer) {
            const reader = new BufferCursor(buffer.slice(11));
            const data = [];

            const playerCount = reader.readShort();
            for (let i = 0; i < playerCount; i++) {
                const player = {};
                player.id = reader.readByte();
                
                const nicknameLength = reader.readByte();
                player.nickname = reader.readConstString(nicknameLength, "ascii");
                player.score = reader.readLong();
                player.ping = reader.readLong();

                data.push(player);
            }
            return data;
        },
        extract_rules(buffer) {
            const reader = new BufferCursor(buffer.slice(11));
            const data = [];

            const ruleCount = reader.readShort();
            for (let i = 0; i < ruleCount; i++) {
                const rule = {};
                const rulenameLength = reader.readByte();
                rule.rulename = reader.readConstString(rulenameLength, "ascii");
                const rulevalueLength = reader.readByte();
                rule.value = reader.readConstString(rulevalueLength, "ascii");

                data.push(rule);
            }
            return data;
        }
    },
}

/**
 * SA:MP Server Protocol
 * @class
*/
class SAMP {
    /**
     * @constructor
     * @param {object} server requested server
     */
    constructor(server, options = {}) {
        this.server = server;
        this.debug = options.debug || false;

        this.net = net.connect(this.server.address, this.server.port, this.debug);
        wrapper = wrapper.bind(this.net);

        return this.init();
    }

    /**
     * Initialization
     * @async
     * @returns {Promise<object>}
     */
    async init() {
        let error, info, rules, players, value;
        const info_payload = Formats.C2S.prepare("i", this.server.address, this.server.port);

        ({ error, value: info } = await wrapper(this.net.send, info_payload, buffer => {
            if (!info_payload.equals(buffer.slice(0, 11))) {
                return { control: NET_WAIT };
            }
            const data = Formats.S2C.extract_info(buffer);

            return { control: NET_CLOSE, data };
        }));
        if (error) return { error }

        const players_payload = Formats.C2S.prepare("d", this.server.address, this.server.port);
        ({ error, value: players } = await wrapper(this.net.send, players_payload, buffer => {
            if (!players_payload.equals(buffer.slice(0, 11))) {
                return { control: NET_WAIT };
            }
            const data = Formats.S2C.extract_players(buffer);
            
            return { control: NET_CLOSE, data };
        }));
        if (error) return { error, info }

        const rules_payload = Formats.C2S.prepare("r", this.server.address, this.server.port);
        ({ error, value: rules } = await wrapper(this.net.send, rules_payload, buffer => {
            if (!rules_payload.equals(buffer.slice(0, 11))) {
                return { control: NET_WAIT };
            }
            const data = Formats.S2C.extract_rules(buffer);

            return { control: NET_CLOSE, data };
        }));
        if (error) return { error, info, players }

        return { info, players, rules };
    }
}

module.exports = SAMP;