const GameServerStream = require("../index");
const gstream = new GameServerStream();

gstream.on("data", result => {
    const { error, info, players, rules } = JSON.parse(result.toString());
    // ...do smth with this xD
});

gstream.write({ address: "127.0.0.1", port: 7777, game: "samp" });