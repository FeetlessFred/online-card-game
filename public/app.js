const socket = io();

let myRoom = null;
let myHand = [];
let currentPlayer = null;


// =========================
// SCREEN FUNCTIONS
// =========================

function hideAll() {

    document
        .querySelectorAll(".container > div")
        .forEach(div => {
            div.classList.add("hidden");
        });

}


function showHome() {

    hideAll();

    document
        .getElementById("home")
        .classList.remove("hidden");

}


function showCreate() {

    hideAll();

    document
        .getElementById("create")
        .classList.remove("hidden");

}


function showJoin() {

    hideAll();

    document
        .getElementById("join")
        .classList.remove("hidden");

}


// =========================
// CREATE GAME
// =========================

function createGame() {

    const name =
        document.getElementById("createName").value.trim();

    const game =
        document.getElementById("game").value;

    const password =
        document.getElementById("password").value;

    const maxPlayers =
        Number(
            document.getElementById("maxPlayers").value
        );


    if (!name || !password) {

        showError(
            "Enter your name and a password!"
        );

        return;
    }


    socket.emit("createGame", {

        name: name,
        game: game,
        password: password,
        maxPlayers: maxPlayers

    });

}


// =========================
// JOIN GAME
// =========================

function joinGame() {

    const name =
        document.getElementById("joinName").value.trim();

    const code =
        document.getElementById("gameCode").value.trim();

    const password =
        document.getElementById("joinPassword").value;


    if (!name || !code || !password) {

        showError(
            "Enter your name, game code and password!"
        );

        return;
    }


    socket.emit("joinGame", {

        name: name,
        code: code,
        password: password

    });

}


// =========================
// GAME CREATED
// =========================

socket.on("gameCreated", data => {

    myRoom = data.code;

    document
        .getElementById("roomCode")
        .textContent = data.code;

    hideAll();

    document
        .getElementById("lobby")
        .classList.remove("hidden");

});


// =========================
// GAME JOINED
// =========================

socket.on("joinedGame", data => {

    myRoom = data.code;

    document
        .getElementById("roomCode")
        .textContent = data.code;

    hideAll();

    document
        .getElementById("lobby")
        .classList.remove("hidden");

});


// =========================
// UPDATE PLAYERS
// =========================

socket.on("roomUpdate", data => {

    const players =
        document.getElementById("players");

    players.innerHTML = "";


    data.players.forEach(player => {

        const div =
            document.createElement("div");

        div.className = "player";

        div.textContent = player.name;


        if (player.id === data.host) {

            div.textContent += " 👑 HOST";

        }


        players.appendChild(div);

    });


    // Show start button only to host

    const startButton =
        document.getElementById("startButton");


    if (socket.id === data.host) {

        startButton.style.display = "block";

    } else {

        startButton.style.display = "none";

    }

});


// =========================
// START GAME
// =========================

function startGame() {

    socket.emit("startGame");

}


// =========================
// GAME STARTED
// =========================

socket.on("gameStarted", data => {

    hideAll();

    document
        .getElementById("game")
        .classList.remove("hidden");


    document
        .getElementById("gameTitle")
        .textContent = data.game;

});


// =========================
// GAME STATE
// =========================

socket.on("gameState", data => {

    myHand = data.hand;

    currentPlayer = data.currentPlayer;


    // -------------------------
    // PLAYERS
    // -------------------------

    const players =
        document.getElementById("gamePlayers");

    players.innerHTML = "";


    data.players.forEach(player => {

        const div =
            document.createElement("div");

        div.className = "player";

        div.textContent =
            `${player.name} - ${player.cardCount} cards`;


        if (player.id === data.currentPlayer) {

            div.textContent += " ⭐ TURN";

        }


        players.appendChild(div);

    });


    // -------------------------
    // DISCARD CARD
    // -------------------------

    const discard =
        document.getElementById("discard");

    discard.innerHTML = "";


    if (data.discard.length > 0) {

        const card =
            data.discard[data.discard.length - 1];

        discard.appendChild(
            createCardElement(card, false)
        );

    }


    // -------------------------
    // MY HAND
    // -------------------------

    const hand =
        document.getElementById("hand");

    hand.innerHTML = "";


    data.hand.forEach((card, index) => {

        const cardElement =
            createCardElement(card, true);

        cardElement.onclick = () => {

            playCard(index);

        };

        hand.appendChild(cardElement);

    });


    // -------------------------
    // TURN MESSAGE
    // -------------------------

    const status =
        document.getElementById("turnMessage");


    if (socket.id === data.currentPlayer) {

        status.textContent =
            "⭐ IT'S YOUR TURN!";

    } else {

        const player =
            data.players.find(
                p => p.id === data.currentPlayer
            );


        if (player) {

            status.textContent =
                `Waiting for ${player.name}...`;

        }

    }


    // -------------------------
    // DRAW BUTTON
    // -------------------------

    const drawButton =
        document.getElementById("drawButton");


    if (socket.id === data.currentPlayer) {

        drawButton.disabled = false;

    } else {

        drawButton.disabled = true;

    }


    // -------------------------
    // WINNER
    // -------------------------

    if (data.winner) {

        const winner =
            data.players.find(
                p => p.id === data.winner
            );


        if (winner) {

            status.textContent =
                `🏆 ${winner.name} WINS!`;

        }

        drawButton.disabled = true;

    }

});


// =========================
// CREATE CARD
// =========================

function createCardElement(card, clickable) {

    const div =
        document.createElement("div");

    div.className = "card";


    // Make hearts and diamonds red

    if (
        card.suit === "♥" ||
        card.suit === "♦"
    ) {

        div.classList.add("red");

    }


    div.innerHTML = `
        <div class="cardValue">
            ${card.value}
        </div>

        <div class="cardSuit">
            ${card.suit}
        </div>
    `;


    if (clickable) {

        div.classList.add("clickable");

    }


    return div;

}


// =========================
// PLAY CARD
// =========================

function playCard(index) {

    socket.emit("playCard", index);

}


// =========================
// DRAW CARD
// =========================

function drawCard() {

    socket.emit("drawCard");

}


// =========================
// WINNER
// =========================

socket.on("gameWinner", data => {

    const status =
        document.getElementById("turnMessage");

    status.textContent =
        `🏆 ${data.name} WINS THE GAME!`;

});


// =========================
// ERRORS
// =========================

socket.on("errorMessage", message => {

    showError(message);

});


function showError(message) {

    const error =
        document.getElementById("error");

    error.textContent = message;


    setTimeout(() => {

        error.textContent = "";

    }, 4000);

}
