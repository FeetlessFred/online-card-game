const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};

// Make a random 4-digit room code
function createCode() {
    let code;

    do {
        code = Math.floor(1000 + Math.random() * 9000).toString();
    } while (rooms[code]);

    return code;
}

// Create a deck
function createDeck() {
    const suits = ["♠", "♥", "♦", "♣"];
    const values = [
        "A", "2", "3", "4", "5", "6", "7",
        "8", "9", "10", "J", "Q", "K"
    ];

    const deck = [];

    for (const suit of suits) {
        for (const value of values) {
            deck.push({
                value: value,
                suit: suit
            });
        }
    }

    return deck;
}

// Shuffle deck
function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}

// Send updated lobby
function updateRoom(code) {
    const room = rooms[code];

    if (!room) return;

    io.to(code).emit("roomUpdate", {
        players: room.players.map(player => ({
            id: player.id,
            name: player.name
        })),
        host: room.host,
        maxPlayers: room.maxPlayers
    });
}

// Send the current game state
function sendGameState(code) {
    const room = rooms[code];

    if (!room) return;

    room.players.forEach(player => {
        io.to(player.id).emit("gameState", {
            players: room.players.map(p => ({
                id: p.id,
                name: p.name,
                cardCount: p.hand.length
            })),
            hand: player.hand,
            discard: room.discard,
            currentPlayer: room.players[room.currentPlayer].id,
            winner: room.winner
        });
    });
}

io.on("connection", socket => {

    // =========================
    // CREATE GAME
    // =========================

    socket.on("createGame", data => {

        const code = createCode();

        rooms[code] = {
            game: data.game || "Card Game",
            password: data.password,
            maxPlayers: Math.min(
                Math.max(Number(data.maxPlayers) || 4, 2),
                4
            ),

            host: socket.id,

            players: [
                {
                    id: socket.id,
                    name: data.name || "Player",
                    hand: []
                }
            ],

            started: false,
            deck: [],
            discard: [],
            currentPlayer: 0,
            winner: null
        };

        socket.join(code);
        socket.roomCode = code;

        socket.emit("gameCreated", {
            code: code,
            game: rooms[code].game
        });

        updateRoom(code);
    });


    // =========================
    // JOIN GAME
    // =========================

    socket.on("joinGame", data => {

        const code = String(data.code).trim();
        const room = rooms[code];

        if (!room) {
            socket.emit(
                "errorMessage",
                "Game does not exist!"
            );
            return;
        }

        if (room.started) {
            socket.emit(
                "errorMessage",
                "The game has already started!"
            );
            return;
        }

        if (room.players.length >= room.maxPlayers) {
            socket.emit(
                "errorMessage",
                "The game is full!"
            );
            return;
        }

        if (room.password !== data.password) {
            socket.emit(
                "errorMessage",
                "Wrong password!"
            );
            return;
        }

        room.players.push({
            id: socket.id,
            name: data.name || "Player",
            hand: []
        });

        socket.join(code);
        socket.roomCode = code;

        socket.emit("joinedGame", {
            code: code
        });

        updateRoom(code);
    });


    // =========================
    // START GAME
    // =========================

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

        if (room.started) return;

        // Create and shuffle deck
        room.deck = shuffle(createDeck());

        // Deal 7 cards to every player
        room.players.forEach(player => {

            player.hand = [];

            for (let i = 0; i < 7; i++) {
                player.hand.push(room.deck.pop());
            }

        });

        // First card in discard pile
        room.discard = [room.deck.pop()];

        // First player
        room.currentPlayer = 0;

        room.started = true;
        room.winner = null;

        io.to(code).emit("gameStarted", {
            game: room.game
        });

        sendGameState(code);
    });


    // =========================
    // PLAY CARD
    // =========================

    socket.on("playCard", cardIndex => {

        const code = socket.roomCode;
        const room = rooms[code];

        if (!room) return;

        if (!room.started) return;

        if (room.winner) return;

        const playerIndex = room.players.findIndex(
            player => player.id === socket.id
        );

        if (playerIndex === -1) return;

        // Not your turn
        if (playerIndex !== room.currentPlayer) {

            socket.emit(
                "errorMessage",
                "It is not your turn!"
            );

            return;
        }

        const player = room.players[playerIndex];

        const index = Number(cardIndex);

        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= player.hand.length
        ) {
            return;
        }

        const card = player.hand[index];

        const topCard =
            room.discard[room.discard.length - 1];

        // Card must match suit OR value
        const canPlay =
            card.suit === topCard.suit ||
            card.value === topCard.value;

        if (!canPlay) {

            socket.emit(
                "errorMessage",
                "You can only play a card with the same suit or value!"
            );

            return;
        }

        // Remove card from hand
        player.hand.splice(index, 1);

        // Put card on discard pile
        room.discard.push(card);

        // Check winner
        if (player.hand.length === 0) {

            room.winner = player.id;

            io.to(code).emit("gameWinner", {
                name: player.name
            });

            sendGameState(code);

            return;
        }

        // Next player's turn
        room.currentPlayer =
            (room.currentPlayer + 1) %
            room.players.length;

        sendGameState(code);
    });


    // =========================
    // DRAW CARD
    // =========================

    socket.on("drawCard", () => {

        const code = socket.roomCode;
        const room = rooms[code];

        if (!room) return;

        if (!room.started) return;

        if (room.winner) return;

        const playerIndex = room.players.findIndex(
            player => player.id === socket.id
        );

        if (playerIndex !== room.currentPlayer) {

            socket.emit(
                "errorMessage",
                "It is not your turn!"
            );

            return;
        }

        // If deck is empty, recycle discard pile
        if (room.deck.length === 0) {

            if (room.discard.length > 1) {

                const topCard =
                    room.discard.pop();

                room.deck = shuffle(room.discard);

                room.discard = [topCard];

            } else {

                socket.emit(
                    "errorMessage",
                    "There are no cards left to draw!"
                );

                return;
            }
        }

        // Give player a card
        room.players[playerIndex].hand.push(
            room.deck.pop()
        );

        // Move turn
        room.currentPlayer =
            (room.currentPlayer + 1) %
            room.players.length;

        sendGameState(code);
    });


    // =========================
    // DISCONNECT
    // =========================

    socket.on("disconnect", () => {

        const code = socket.roomCode;

        if (!code || !rooms[code]) {
            return;
        }

        const room = rooms[code];

        room.players = room.players.filter(
            player => player.id !== socket.id
        );

        // Delete empty room
        if (room.players.length === 0) {

            delete rooms[code];

            return;
        }

        // Give host to another player
        if (room.host === socket.id) {
            room.host = room.players[0].id;
        }

        // If game is running, fix current player
        if (room.started) {

            if (room.currentPlayer >= room.players.length) {
                room.currentPlayer = 0;
            }

            sendGameState(code);

        } else {

            updateRoom(code);

        }
    });

});


// =========================
// START SERVER
// =========================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {

    console.log(
        `Card game running on port ${PORT}`
    );

});
