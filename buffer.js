/**
 * Tool which make easier reading the buffers
 */
class BufferCursor {
	/**
	 * @constructor
	 * @param {Buffer} buffer
	 * @param {object} options 
	 */
	constructor(buffer, options = {}) {
		this.buffer = buffer;
		this.cursor = 0;
	}

	/**
	 * Skipping n bytes
	 * @param {number} n
	 */
	skip(n) {
		this.cursor += n;
	}

	/**
	 * Settng new offset
	 * @param {number} new_offset
	 */
	set offset(new_offset) {
		this.cursor = new_offset;
	}

	/**
	 * Reading int32 big endian from loaded buffer
	 */
	readInt32BE() {
		let value = this.buffer.readInt32BE(this.cursor);
		this.cursor += 4;
		return value;
	}

	/**
	 * Reading string from loaded buffer
	 */
	readString() {
		let string = [];
		while (this.buffer[this.cursor] !== 0x00 && this.cursor < this.buffer.length) {
			string.push(this.buffer[this.cursor]);
			this.cursor++;
		}

		this.cursor++;
		return Buffer.from(string).toString("utf8");
	}

	/**
	 * Reading const string from loaded buffer
	 * @param {number} length length of read string
	 */
	readConstString(length, encoding = "utf8") {
		let string = [];
		const border = length + this.cursor;
		while (this.cursor < border && this.cursor < this.buffer.length) string.push(this.buffer[this.cursor++]);
		return Buffer.from(string).toString(encoding);
	}

	/**
	 * Read byte from loaded buffer
	 */
	readByte() {
		if (this.cursor >= this.buffer.length - 1) return;
		return this.buffer.readInt8(this.cursor++);
	}

	/**
	 * Read int16 little endian from loaded buffer
	 */
	readShort() {
		let int16 = this.buffer.readInt16LE(this.cursor);
		this.cursor += 2;
		return int16;
	}

	/**
	 * Read int32 little endian from loaded buffer
	 */
	readLong() {
		if (this.cursor >= this.buffer.length - 1) return;
		let int32 = this.buffer.readInt32LE(this.cursor);
		this.cursor += 4;
		return int32;
	}

	/**
	 * Read float little endian from loaded buffer
	 */
	readFloat() {
		let float32 = this.buffer.readFloatLE(this.cursor);
		this.cursor += 4;
		return float32;
	}

	/**
	 * Read int64 little endian from loaded buffer
	 */
	readLongLong() {
		var int64 = (this.buffer.readUInt32LE(this.cursor + 4) << 8) + this.buffer.readUInt32LE(this.cursor);;
		this.cursor += 8;
		return int64;
	}

	/**
	 * Tool which make easier writing/rewriting buffers
	 * @param {*} buffer1 to write to
	 * @param {*} buffer2 from which is written
	 * @param {*} offset 
	 */
	static writeBuffer(buffer1, buffer2, offset) {
		offset = offset ? offset : 0;
		for (let byte of buffer2) {
			buffer1[offset++] = byte;
		}
		return buffer1;
	}
}

module.exports = BufferCursor;