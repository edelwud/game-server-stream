const GameServerStream = require("../index");
const split = require("split");
const fs = require("fs");
const path = require("path");

const gserver = new GameServerStream();

fs.createReadStream(path.resolve(__dirname, "game-servers.json"))
    .pipe(split())
    .pipe(gserver)
    .pipe(process.stdout);
