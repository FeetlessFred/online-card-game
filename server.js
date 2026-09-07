const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};

// Create a random 4 digit code
function createCode() {
    let code;

    do {
        code = Math.floor(1000 + Math.random() * 9000).toString();
    } while (rooms[code]);

    return code;
}


// CREATE GAME
io.on("connection", (socket) => {

    socket.on("createGame", (data) => {

        const code = createCode();

        rooms[code] = {
            game: data.game,
            password: data.password,
            maxPlayers: data.maxPlayers,
            host: socket.id,

            players: [
                {
                    id: socket.id,
                    name: data.name
                }
            ],

            started: false
        };

        socket.join(code);

        socket.roomCode = code;

        socket.emit("gameCreated", {
            code: code,
            game: data.game
        });

        updateRoom(code);
    });


    // JOIN GAME
    socket.on("joinGame", (data) => {

        const room = rooms[data.code];

        if (!room) {
            socket.emit("errorMessage", "Game does not exist!");
            return;
        }

        if (room.started) {
            socket.emit("errorMessage", "The game has already started!");
            return;
        }

        if (room.players.length >= room.maxPlayers) {
            socket.emit("errorMessage", "The game is full!");
            return;
        }

        if (room.password !== data.password) {
            socket.emit("errorMessage", "Wrong password!");
            return;
        }


        room.players.push({
            id: socket.id,
            name: data.name
        });

        socket.join(data.code);

        socket.roomCode = data.code;

        socket.emit("joinedGame", {
            code: data.code
        });

        updateRoom(data.code);
    });


    // HOST STARTS GAME
    socket.on("startGame", () => {

        const code = socket.roomCode;
        const room = rooms[code];

        if (!room) return;

        if (room.host !== socket.id) {
            return;
        }

        if (room.players.length < 2) {
            socket.emit(
                "errorMessage",
                "You need at least 2 players!"
            );

            return;
        }

        room.started = true;

        io.to(code).emit("gameStarted", {
            game: room.game,
            players: room.players
        });
    });


    // PLAYER LEAVES
    socket.on("disconnect", () => {

        const code = socket.roomCode;

        if (!code || !rooms[code]) {
            return;
        }

        const room = rooms[code];

        room.players = room.players.filter(
            player => player.id !== socket.id
        );

        if (room.players.length === 0) {
            delete rooms[code];
            return;
        }

        // Give host to another player
        if (room.host === socket.id) {
            room.host = room.players[0].id;
        }

        updateRoom(code);
    });

});


// Send updated player list to everyone
function updateRoom(code) {

    const room = rooms[code];

    if (!room) return;

    io.to(code).emit("roomUpdate", {
        players: room.players,
        host: room.host,
        maxPlayers: room.maxPlayers
    });
}


server.listen(3000, () => {

    console.log("Card game running!");

    console.log(
        "Open http://localhost:3000"
    );

});
