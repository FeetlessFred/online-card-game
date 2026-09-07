const socket = io();

let myRoom = null;


// ----------------------
// SCREEN FUNCTIONS
// ----------------------

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



// ----------------------
// CREATE GAME
// ----------------------

function createGame() {

    const name =
        document.getElementById("createName").value;

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



// ----------------------
// JOIN GAME
// ----------------------

function joinGame() {

    const name =
        document.getElementById("joinName").value;

    const code =
        document.getElementById("gameCode").value;

    const password =
        document.getElementById("joinPassword").value;


    socket.emit("joinGame", {

        name: name,

        code: code,

        password: password

    });

}



// ----------------------
// GAME CREATED
// ----------------------

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



// ----------------------
// GAME JOINED
// ----------------------

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



// ----------------------
// UPDATE PLAYERS
// ----------------------

socket.on("roomUpdate", data => {

    const players =
        document.getElementById("players");

    players.innerHTML = "";


    data.players.forEach(player => {

        const div =
            document.createElement("div");

        div.className = "player";

        div.textContent =
            player.name;

        if (player.id === data.host) {

            div.textContent += " 👑 HOST";

        }

        players.appendChild(div);

    });


    // Only host sees start button

    const startButton =
        document.getElementById("startButton");


    if (socket.id === data.host) {

        startButton.style.display =
            "block";

    } else {

        startButton.style.display =
            "none";

    }

});



// ----------------------
// START GAME
// ----------------------

function startGame() {

    socket.emit("startGame");

}



// ----------------------
// GAME STARTED
// ----------------------

socket.on("gameStarted", data => {

    hideAll();

    document
        .getElementById("game")
        .classList.remove("hidden");


    document
        .getElementById("gameTitle")
        .textContent = data.game;


    const players =
        document.getElementById("gamePlayers");

    players.innerHTML = "";


    data.players.forEach(player => {

        const div =
            document.createElement("div");

        div.className = "player";

        div.textContent =
            player.name;

        players.appendChild(div);

    });


    // We'll add the actual card
    // game here next.

});



// ----------------------
// ERRORS
// ----------------------

socket.on("errorMessage", message => {

    showError(message);

});


function showError(message) {

    document
        .getElementById("error")
        .textContent = message;

}
