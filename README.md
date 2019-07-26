Game-Server-Query
===

> Tool for sending -> receiving -> extacting answer from multiplayer game server using stream

## Introduction

This module is meant to help with help with multi-packet server response design and much more than that xD

Say you have a multiplayer game server with detailed information from which you need to get using `game-server-stream`. 
All you need to do is to know the address of the server and the protocol by which it works (for more information see Usage).
Also you can create line-delimited JSON readable stream, example can be found at `examples` folder.

## Supported games

Gamename | Prototype | Supported
---|---|---
Half-life | `source` | yep
Half-life 2 | `source` | yep
Couter-Strike 1.6 | `source` | yep
Couter-Strike Source | `source` | yep
Couter-Strike Global Offensive | `source` | yep
Team Fortress 2 | `source` | yep
Lead 4 Dead | `source` | yep
Lead 4 Dead 2 | `source` | yep
Rust | `source` | yep
Garry's mod | `source` | yep
ARK: Survival Evolved | `source` | yep
San Andres Multiplayer | `samp` | yep
San Andres Criminal Russia Multiplayer | `samp` | yep
Minecraft | `minecraft` | nope :(

## To Install

```sh
$ npm install --save game-server-stream
```

## Usage

```js
const GameServerStream = require("game-server-stream");
const gstream = new GameServerStream(); // Initialization

/**
 * result -> buffer
 * result.toString() -> JSON
 */
gstream.on("data", result => {
    const { error, info, players, rules } = JSON.parse(result.toString());
    // ...do smth with this xD
});

// using standart .write method
gstream.write({ address: "127.0.0.1", port: 7777, game: "samp" });
```

## License
ISC

## Thank's, have fun :)