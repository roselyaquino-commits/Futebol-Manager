import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
    getDatabase,
    ref,
    set,
    get,
    onValue,
    remove,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAjprOosfsm4k3LZyS4X3exdLPgYWsYfw4",
    authDomain: "football-manager-online-742cf.firebaseapp.com",
    databaseURL: "https://football-manager-online-742cf-default-rtdb.firebaseio.com",
    projectId: "football-manager-online-742cf",
    storageBucket: "football-manager-online-742cf.firebasestorage.app",
    messagingSenderId: "908617116120",
    appId: "1:908617116120:web:e20d433671a8f0caebeaad",
    measurementId: "G-419FP958QM"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const playerId =
    "p_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).substring(2, 8);

let selectedCrest = "⚽";
let selectedJoinCrest = "⚽";
let currentRoomCode = "";
let roomListener = null;

const screens = document.querySelectorAll(".screen");

const homeScreen = document.getElementById("homeScreen");
const roomMenu = document.getElementById("roomMenu");
const createRoomScreen = document.getElementById("createRoomScreen");
const joinRoomScreen = document.getElementById("joinRoomScreen");
const lobbyScreen = document.getElementById("lobbyScreen");

function showScreen(screen) {
    screens.forEach(function(item) {
        item.classList.remove("active");
    });

    screen.classList.add("active");
}

function notify(message) {
    const notification = document.getElementById("notification");

    notification.textContent = message;
    notification.classList.add("show");

    setTimeout(function() {
        notification.classList.remove("show");
    }, 2200);
}

function generateRoomCode() {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    for (let i = 0; i < 6; i++) {
        const randomIndex =
            Math.floor(Math.random() * characters.length);

        code += characters[randomIndex];
    }

    return code;
}

async function createRoom(playerName, teamName, crest) {

    let code = "";
    let exists = true;

    while (exists) {

        code = generateRoomCode();

        const roomRef = ref(db, "rooms/" + code);
        const snapshot = await get(roomRef);

        exists = snapshot.exists();
    }

    const roomRef = ref(db, "rooms/" + code);

    const playerRef =
        ref(db, "rooms/" + code + "/players/" + playerId);

    await set(roomRef, {

        createdAt: Date.now(),

        hostId: playerId,

        players: {

            [playerId]: {

                name: playerName,
                teamName: teamName,
                crest: crest,
                joinedAt: Date.now(),
                isHost: true

            }

        }

    });

    onDisconnect(playerRef).remove();

    currentRoomCode = code;

    document.getElementById("roomCode").textContent = code;

    startLobbyListener(code);

    showScreen(lobbyScreen);

    notify("Sala criada!");
}

async function joinRoom(
    playerName,
    teamName,
    crest,
    roomCode
) {

    const roomRef =
        ref(db, "rooms/" + roomCode);

    const snapshot =
        await get(roomRef);

    if (!snapshot.exists()) {

        return {
            success: false,
            message: "Sala não encontrada."
        };
    }

    const roomData = snapshot.val();

    const players = roomData.players || {};

    const playerCount =
        Object.keys(players).length;

    if (playerCount >= 4) {

        return {
            success: false,
            message: "Essa sala já está cheia."
        };
    }

    const playerRef =
        ref(
            db,
            "rooms/" +
            roomCode +
            "/players/" +
            playerId
        );

    await set(playerRef, {

        name: playerName,
        teamName: teamName,
        crest: crest,
        joinedAt: Date.now(),
        isHost: false

    });

    onDisconnect(playerRef).remove();

    currentRoomCode = roomCode;

    document.getElementById("roomCode").textContent =
        roomCode;

    startLobbyListener(roomCode);

    showScreen(lobbyScreen);

    notify("Você entrou na sala!");

    return {
        success: true
    };
}

function startLobbyListener(roomCode) {

    if (roomListener) {
        roomListener();
        roomListener = null;
    }

    const roomRef =
        ref(db, "rooms/" + roomCode);

    roomListener = onValue(
        roomRef,
        function(snapshot) {

            if (!snapshot.exists()) {

                notify("A sala foi encerrada.");

                showScreen(roomMenu);

                return;
            }

            const roomData = snapshot.val();

            const players =
                roomData.players || {};

            renderPlayers(players);
        }
    );
}

function renderPlayers(players) {

    const container =
        document.getElementById("playersLobby");

    container.innerHTML = "";

    const playerList =
        Object.entries(players);

    playerList.forEach(function(entry) {

        const player = entry[1];

        const card =
            document.createElement("div");

        card.className = "lobby-player";

        card.innerHTML = `

            <div class="player-crest">
                ${player.crest || "⚽"}
            </div>

            <div class="player-info">

                <strong>
                    ${escapeHtml(player.name)}
                </strong>

                <span>
                    ${escapeHtml(player.teamName)}
                </span>

            </div>

            ${
                player.isHost
                ? '<span class="host-badge">DONO</span>'
                : ''
            }

        `;

        container.appendChild(card);
    });

    updateLobbyMode(playerList.length);
}

function updateLobbyMode(playerCount) {

    const modeTitle =
        document.querySelector(".mode-question strong");

    const modeDescription =
        document.querySelector(".mode-preview p");

    if (!modeTitle || !modeDescription) {
        return;
    }

    if (playerCount === 1) {

        modeTitle.textContent =
            "Aguardando jogadores";

        modeDescription.textContent =
            "Compartilhe o código da sala com seus amigos.";

    } else if (playerCount === 2) {

        modeTitle.textContent =
            "1 × 1";

        modeDescription.textContent =
            "Partida entre dois jogadores.";

    } else if (playerCount === 3) {

        modeTitle.textContent =
            "1 × 1 × 1";

        modeDescription.textContent =
            "Três jogadores na mesma partida.";

    } else if (playerCount === 4) {

        modeTitle.textContent =
            "2 × 2 ou 1 × 1 × 1 × 1";

        modeDescription.textContent =
            "Com quatro jogadores, vocês escolhem o formato.";
    }
}

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


/* ESCUDOS - CRIAR */

document
    .querySelectorAll("#crestOptions .crest-option")
    .forEach(function(button) {

        button.addEventListener("click", function() {

            document
                .querySelectorAll("#crestOptions .crest-option")
                .forEach(function(item) {
                    item.classList.remove("selected");
                });

            button.classList.add("selected");

            selectedCrest =
                button.dataset.crest;
        });
    });


/* ESCUDOS - ENTRAR */

document
    .querySelectorAll("#joinCrestOptions .crest-option")
    .forEach(function(button) {

        button.addEventListener("click", function() {

            document
                .querySelectorAll("#joinCrestOptions .crest-option")
                .forEach(function(item) {
                    item.classList.remove("selected");
                });

            button.classList.add("selected");

            selectedJoinCrest =
                button.dataset.crest;
        });
    });


/* NAVEGAÇÃO */

document
    .getElementById("playFriendsButton")
    .addEventListener("click", function() {
        showScreen(roomMenu);
    });

document
    .getElementById("backHomeButton")
    .addEventListener("click", function() {
        showScreen(homeScreen);
    });

document
    .getElementById("createRoomButton")
    .addEventListener("click", function() {
        showScreen(createRoomScreen);
    });

document
    .getElementById("backRoomMenuFromCreate")
    .addEventListener("click", function() {
        showScreen(roomMenu);
    });

document
    .getElementById("joinRoomButton")
    .addEventListener("click", function() {
        showScreen(joinRoomScreen);
    });

document
    .getElementById("backRoomMenuFromJoin")
    .addEventListener("click", function() {
        showScreen(roomMenu);
    });


/* CRIAR SALA */

document
    .getElementById("createRoomConfirm")
    .addEventListener("click", async function() {

        const playerName =
            document
                .getElementById("playerName")
                .value
                .trim();

        const teamName =
            document
                .getElementById("teamName")
                .value
                .trim();

        if (!playerName) {
            notify("Digite seu nome.");
            return;
        }

        if (!teamName) {
            notify("Digite o nome do seu time.");
            return;
        }

        try {

            await createRoom(
                playerName,
                teamName,
                selectedCrest
            );

        } catch (error) {

            console.error(error);

            notify("Erro ao criar a sala.");
        }
    });


/* COPIAR CÓDIGO */

document
    .getElementById("copyCodeButton")
    .addEventListener("click", async function() {

        const code =
            document
                .getElementById("roomCode")
                .textContent;

        try {

            await navigator.clipboard.writeText(code);

            notify("Código copiado!");

        } catch (error) {

            notify("Código: " + code);
        }
    });


/* ENTRAR NA SALA */

document
    .getElementById("enterRoomConfirm")
    .addEventListener("click", async function() {

        const playerName =
            document
                .getElementById("joinPlayerName")
                .value
                .trim();

        const teamName =
            document
                .getElementById("joinTeamName")
                .value
                .trim();

        const roomCode =
            document
                .getElementById("joinRoomCode")
                .value
                .trim()
                .toUpperCase();

        const error =
            document.getElementById("joinError");

        error.textContent = "";

        if (!playerName) {
            error.textContent = "Digite seu nome.";
            return;
        }

        if (!teamName) {
            error.textContent = "Digite o nome do seu time.";
            return;
        }

        if (roomCode.length !== 6) {
            error.textContent =
                "O código precisa ter 6 caracteres.";
            return;
        }

        try {

            const result =
                await joinRoom(
                    playerName,
                    teamName,
                    selectedJoinCrest,
                    roomCode
                );

            if (!result.success) {
                error.textContent =
                    result.message;
            }

        } catch (firebaseError) {

            console.error(firebaseError);

            error.textContent =
                "Erro ao entrar na sala.";
        }
    });


/* SAIR */

document
    .getElementById("leaveRoomButton")
    .addEventListener("click", async function() {

        if (!currentRoomCode) {
            showScreen(roomMenu);
            return;
        }

        try {

            const playerRef =
                ref(
                    db,
                    "rooms/" +
                    currentRoomCode +
                    "/players/" +
                    playerId
                );

            await remove(playerRef);

        } catch (error) {

            console.error(error);
        }

        if (roomListener) {

            roomListener();
            roomListener = null;
        }

        currentRoomCode = "";

        showScreen(roomMenu);

        notify("Você saiu da sala.");
    });