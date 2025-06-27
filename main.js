/* I. CẤU HÌNH & HẰNG SỐ TOÀN CỤC */
// Lưu trạng thái của game
const config = {
    BOARD_SIZE: 15,
    WINNING_LENGTH: 5,
    TURN_TIME: 30,
    AI_DELAY: 300,
    DEBOUNCE_TIME: 100,
};

const PLAYERS = {HUMAN: 'X', AI: 'O'};
const MODES = {PVP: 'pvp', PVE: 'pve'};
const SOUNDS = {WIN: 'sound-win', LOSE: 'sound-lose', DRAW: 'sound-draw'};


/* II. TRẠNG THÁI GAME & BIẾN DOM */
// Lưu trạng thái của game
const gameState = {
    board: [],
    currentPlayer: PLAYERS.HUMAN,
    isGameActive: true,
    winningCells: [],
    mode: MODES.PVP,
    timeLeft: config.TURN_TIME,
    timerInterval: null,
    isProcessingClick: false,
    isMusicPlaying: false,
    emptyCells: [],
};
// Lưu các phần tử DOM để truy cập nhanh
const dom = {
    boardEl: null,
    statusEl: null,
    modeSelect: null,
    timerEl: null,
    modalEl: null,
    modalMessageEl: null,
    musicEl: null,
    toggleMusicBtn: null,
    restartMainBtn: null,
    restartModalBtn: null,
    closeModalBtn: null,
    savePlayersBtn: null,
    resetHistoryBtn: null,
    nameXEl: null,
    nameOEl: null,
    playerXEl: null,
    playerOEl: null,
    scoreXEl: null,
    scoreOEl: null,
    playerNamesContainer: null,
    scoreContainer: null,
};
// Map lưu các ô cờ để truy cập nhanh theo toạ độ
const cellMap = new Map();


/* III. HỖ TRỢ KHỞI TẠO & DOM */

// Kiểm tra xem tất cả DOM cần thiết đã có chưa
function checkAllDOMElements() {
    const missing = Object.keys(dom).filter(key => !dom[key]);
    if (missing.length > 0) {
        console.error(`Lỗi: Thiếu phần tử DOM: ${missing.join(', ')}`);
        alert('Thiếu phần tử cần thiết trong HTML');
        return false;
    }
    return true;
}


/* IV. NGƯỜI CHƠI & LỊCH SỬ */

// Cập nhật tên người chơi từ localStorage lên giao diện
function updatePlayerNames() {
    const nameX = localStorage.getItem("playerX");
    const nameO = localStorage.getItem("playerO");
    dom.nameXEl.textContent = nameX || "";
    dom.nameOEl.textContent = nameO || "";
    dom.playerXEl.value = nameX || "";
    dom.playerOEl.value = nameO || "";
}

// Lưu tên người chơi vào localStorage
function savePlayers() {
    const nameX = dom.playerXEl.value.trim().slice(0, 20) || "X";
    const nameO = dom.playerOEl.value.trim().slice(0, 20) || "O";
    localStorage.setItem("playerX", nameX);
    localStorage.setItem("playerO", nameO);
    updatePlayerNames();
    showModal('<i class="ti-save"></i> Đã lưu tên người chơi!');
}

// Cập nhật điểm số sau khi có người thắng
function updateScore(winner) {
    const modeSuffix = gameState.mode === MODES.PVP ? 'pvp' : 'pve';
    const scoreKey = `score_${winner}_${modeSuffix}`;
    const score = parseInt(localStorage.getItem(scoreKey) || "0") + 1;
    localStorage.setItem(scoreKey, String(score));
    refreshScoreUI();
    document.getElementById(`score${winner}`).textContent = String(score);
}

// Hiển thị modal xác nhận reset lịch sử
function resetHistory() {
    const msg = gameState.mode === MODES.PVP
        ? 'Xác nhận reset lịch sử? <br><button onclick="confirmResetPVP()">Xác nhận</button>'
        : 'Xác nhận reset điểm? <br><button onclick="confirmResetPVE()">Xác nhận</button>';
    showModal(`<i class="ti-reload"></i> ${msg}`);
}

// Thực hiện reset lịch sử cho chế độ PvP
function confirmResetPVP() {
    ["playerX", "playerO", "score_X_pvp", "score_O_pvp"].forEach(key => localStorage.removeItem(key));
    dom.playerXEl.value = "";
    dom.playerOEl.value = "";
    dom.scoreXEl.textContent = "0";
    dom.scoreOEl.textContent = "0";
    updatePlayerNames();
    closeModal();
}

// Thực hiện reset điểm cho chế độ PvE
function confirmResetPVE() {
    ["score_X_pve", "score_O_pve"].forEach(key => localStorage.removeItem(key));
    dom.scoreXEl.textContent = "0";
    dom.scoreOEl.textContent = "0";
    closeModal();
}


/* V. GIAO DIỆN & HIỆU ỨNG */

// Cập nhật nội dung ô cờ UI theo người chơi
function updateCellUI(row, col, player) {
    const cell = cellMap.get(`${row}-${col}`);
    if (cell) {
        cell.textContent = player;
        cell.classList.add(player === PLAYERS.HUMAN ? 'x-color' : 'o-color');
    }
}

function updateStatusMessage(message, className) {
    dom.statusEl.innerHTML = message;
    dom.statusEl.className = className;
}

function formatMessage(text, iconClass) {
    return `<i class="${iconClass}"></i> ${text}`;
}

// Cập nhật trạng thái lượt hiện tại lên giao diện
function updateStatusUI() {
    const current = gameState.currentPlayer;
    const name = gameState.mode === MODES.PVE
        ? (current === PLAYERS.HUMAN ? 'Bạn' : 'Máy')
        : localStorage.getItem(`player${current}`) || current;
    const icon = gameState.mode === MODES.PVE && current === PLAYERS.AI ? 'ti-android' : 'ti-user';
    updateStatusMessage(formatMessage(`Đến lượt: ${name}`, icon), current === PLAYERS.HUMAN ? 'x-color' : 'o-color');
}

// Làm nổi bật các ô thắng
function highlightWinningCellsUI() {
    gameState.winningCells.forEach(([r, c]) => {
        const cell = cellMap.get(`${r}-${c}`);
        if (cell) cell.classList.add('win-color', 'win-shadow', 'disabled');
    });
    document.body.classList.add('win-overlay');
    document.querySelectorAll('.cell').forEach(c => c.classList.add('disabled'));
}

// Hiển thị modal với thông báo
function showModal(message) {
    dom.modalMessageEl.innerHTML = message;
    dom.modalEl.classList.remove('hidden');
    document.body.classList.add('modal-open');
    if (gameState.isMusicPlaying) dom.musicEl?.pause();
}

// Đóng modal
function closeModal() {
    dom.modalEl.classList.add('hidden');
    document.body.classList.remove('modal-open');
    if (gameState.isMusicPlaying) dom.musicEl?.play().catch(() => {
    });
    updatePlayerNameVisibility();
    refreshScoreUI();
}

// Phát hiệu ứng âm thanh
function playSound(soundId) {
    const sound = document.getElementById(soundId);
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {
        });
    }
}

// Bật/tắt nhạc nền
function toggleMusic() {
    gameState.isMusicPlaying = !gameState.isMusicPlaying;
    localStorage.setItem('musicPlaying', gameState.isMusicPlaying);
    if (dom.musicEl) {
        dom.musicEl.muted = !gameState.isMusicPlaying;
        gameState.isMusicPlaying ? dom.musicEl.play().catch(() => {
        }) : dom.musicEl.pause();
    }
    dom.toggleMusicBtn.innerHTML = gameState.isMusicPlaying
        ? '<i class="ti-control-stop"></i> Tắt nhạc'
        : '<i class="ti-control-play"></i> Bật nhạc';
    dom.toggleMusicBtn.classList.toggle('music-on', gameState.isMusicPlaying);
    dom.toggleMusicBtn.classList.toggle('music-off', !gameState.isMusicPlaying);
}


/* VI. LOGIC GAME */

// Kiểm tra xem ô cờ có nằm trong bảng hay không
function isInBounds(row, col) {
    return row >= 0 && row < config.BOARD_SIZE && col >= 0 && col < config.BOARD_SIZE;
}

// Hàm debounce chống click liên tục
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// Xử lý khi có người thắng
function handleWin() {
    gameState.isGameActive = false;
    const sound = (gameState.mode === MODES.PVP || gameState.currentPlayer === PLAYERS.HUMAN) ? SOUNDS.WIN : SOUNDS.LOSE;
    playSound(sound);
    highlightWinningCellsUI();
    const name = localStorage.getItem(`player${gameState.currentPlayer}`) || gameState.currentPlayer;
    updateStatusMessage(formatMessage(`${name} thắng!`, 'ti-crown'), 'win-color');
    const message = gameState.mode === MODES.PVP
        ? formatMessage(`Người chơi ${name} thắng!`, 'ti-crown')
        : (gameState.currentPlayer === PLAYERS.HUMAN
            ? formatMessage('Bạn thắng!', 'ti-crown')
            : formatMessage('Máy thắng!', 'ti-face-sad'));
    showModal(message);
    resetTimer();
    updateScore(gameState.currentPlayer);
    setButtonsDisabled(true);
}

// Xử lý khi hoà
function handleDraw() {
    gameState.isGameActive = false;
    playSound(SOUNDS.DRAW);
    updateStatusMessage(formatMessage('Hòa!', 'ti-hand-open'), 'draw');
    showModal(formatMessage('Trò chơi hòa!', 'ti-hand-open'));
    resetTimer();
    setButtonsDisabled(true);
}

// Xử lý khi hết thời gian
function handleTimeout() {
    resetTimer();
    if (gameState.emptyCells.length === 0) return handleDraw();
    const winner = gameState.currentPlayer === PLAYERS.HUMAN ? PLAYERS.AI : PLAYERS.HUMAN;
    gameState.isGameActive = false;
    const winnerName = localStorage.getItem(`player${winner}`) || winner;
    updateStatusMessage(formatMessage(`Hết giờ! ${winnerName} thắng!`, 'ti-time'), 'timeout');
    showModal(formatMessage(`Hết giờ! ${winnerName} thắng!`, 'ti-time'));
    document.querySelectorAll('.cell').forEach(cell => cell.classList.add('disabled'));
    updateScore(winner);
    setButtonsDisabled(true);
}

// Kiểm tra thắng dựa vào hướng đi
function checkWin(row, col) {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dx, dy] of dirs) {
        let count = 1;
        const cells = [[row, col]];
        for (const step of [-1, 1]) {
            for (let i = 1; i < config.WINNING_LENGTH; i++) {
                const r = row + step * i * dx;
                const c = col + step * i * dy;
                if (!isInBounds(r, c) || gameState.board[r][c] !== gameState.currentPlayer) break;
                count++;
                cells.push([r, c]);
            }
        }
        if (count >= config.WINNING_LENGTH) {
            gameState.winningCells = cells;
            return true;
        }
    }
    return false;
}

// Đánh cờ tại vị trí (row, col)
function placeMove(row, col) {
    row = Number(row);
    col = Number(col);
    if (gameState.board[row][col] !== '') return;
    gameState.board[row][col] = gameState.currentPlayer;
    updateCellUI(row, col, gameState.currentPlayer);
    const index = gameState.emptyCells.findIndex(([r, c]) => r === row && c === col);
    if (index > -1) gameState.emptyCells.splice(index, 1);

    if (checkWin(row, col)) return handleWin();
    if (gameState.emptyCells.length === 0) return handleDraw();
    switchPlayer();

    if (gameState.mode === MODES.PVE && gameState.currentPlayer === PLAYERS.AI) {
        setTimeout(() => {
            aiMove();
            gameState.isProcessingClick = false;
        }, config.AI_DELAY);
    } else {
        gameState.isProcessingClick = false;
    }
}

// Xử lý sự kiện click lên ô cờ
function handleClick(e) {
    if (gameState.isProcessingClick || !gameState.isGameActive) return;
    gameState.isProcessingClick = true;
    const row = e.target.dataset.row;
    const col = e.target.dataset.col;
    placeMove(row, col);
}

// Đổi lượt người chơi
function switchPlayer() {
    gameState.currentPlayer = gameState.currentPlayer === PLAYERS.HUMAN ? PLAYERS.AI : PLAYERS.HUMAN;
    updateStatusUI();
    startTimer();
}


/* VII. TIMER & KHỞI TẠO */

// Bắt đầu đồng hồ đếm thời gian
function startTimer() {
    resetTimer();
    gameState.timeLeft = config.TURN_TIME;
    dom.timerEl.textContent = gameState.timeLeft;
    gameState.timerInterval = setInterval(() => {
        gameState.timeLeft--;
        dom.timerEl.textContent = gameState.timeLeft;
        if (gameState.timeLeft <= 0) handleTimeout();
    }, 1000);
}

// Reset lại timer
function resetTimer() {
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    gameState.timeLeft = config.TURN_TIME;
    dom.timerEl.textContent = gameState.timeLeft;
}

// Bật/tắt trạng thái nút
function setButtonsDisabled(state) {
    [dom.savePlayersBtn, dom.resetHistoryBtn].forEach(btn => {
        if (btn) {
            btn.disabled = state;
            btn.classList.toggle('disabled', state);
        }
    });
}

/* VIII. LOGIC AI */

// AI đánh nước đi
function aiMove() {
    if (!gameState.isGameActive) return;

    let bestMove = {row: -1, col: -1};
    let bestScore = -Infinity;

    for (const [row, col] of gameState.emptyCells) {
        // 1. Nếu đánh thắng → đánh luôn
        gameState.board[row][col] = PLAYERS.AI;
        if (checkWin(row, col)) {
            gameState.board[row][col] = '';
            return placeMove(row, col);
        }
        gameState.board[row][col] = '';

        // 2. Nếu đối thủ HUMAN sắp thắng → chặn
        gameState.board[row][col] = PLAYERS.HUMAN;
        if (checkWin(row, col)) {
            gameState.board[row][col] = '';
            return placeMove(row, col);
        }
        gameState.board[row][col] = '';

        // 3. Chấm điểm ô hiện tại
        const attackScore = evaluatePosition(row, col, PLAYERS.AI);
        const defendScore = evaluatePosition(row, col, PLAYERS.HUMAN);
        const totalScore = attackScore + defendScore * 1.2;

        if (totalScore > bestScore) {
            bestScore = totalScore;
            bestMove = {row, col};
        }
    }

    if (bestMove.row !== -1) {
        placeMove(bestMove.row, bestMove.col);
    }
}

// Chấm điểm vị trí theo hướng
function evaluatePosition(row, col, player) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    return directions.reduce((score, [dx, dy]) =>
        score + evaluateDirection(row, col, dx, dy, player), 0);
}

// Chấm điểm theo từng hướng cụ thể (dx, dy)
function evaluateDirection(row, col, dx, dy, player) {
    let count = 1;
    let openEnds = 0;

    for (const step of [-1, 1]) {
        for (let i = 1; i < config.WINNING_LENGTH; i++) {
            const r = row + step * i * dx;
            const c = col + step * i * dy;
            if (!isInBounds(r, c)) break;

            const cell = gameState.board[r][c];
            if (cell === player) {
                count++;
            } else if (cell === '') {
                openEnds++;
                break;
            } else break;
        }
    }

    // Tính điểm đơn giản theo pattern
    if (count >= config.WINNING_LENGTH) return 100000;
    if (count === 4 && openEnds === 2) return 10000;
    if (count === 4 && openEnds === 1) return 5000;
    if (count === 3 && openEnds === 2) return 1000;
    if (count === 3 && openEnds === 1) return 300;
    if (count === 2 && openEnds === 2) return 100;
    if (count === 2 && openEnds === 1) return 30;
    if (count === 1 && openEnds === 2) return 10;

    return 1;
}


/* IX. KHỞI TẠO GAME & BẢNG CỜ */

// Bắt đầu game mới
function restartGame() {
    gameState.mode = dom.modeSelect?.value || MODES.PVP;
    updatePlayerNameVisibility();
    createBoard();
    setButtonsDisabled(false);
}

// Tạo bảng cờ 15x15
function createBoard() {
    if (!dom.boardEl) return;

    dom.boardEl.innerHTML = '';
    cellMap.clear();

    gameState.board = Array(config.BOARD_SIZE).fill(null).map(() =>
        Array(config.BOARD_SIZE).fill('')
    );

    gameState.emptyCells = [];
    const handleClickDebounced = debounce(handleClick, config.DEBOUNCE_TIME);

    for (let r = 0; r < config.BOARD_SIZE; r++) {
        for (let c = 0; c < config.BOARD_SIZE; c++) {
            gameState.emptyCells.push([r, c]);
            const cell = document.createElement('div');
            cell.classList.add('cell', 'board-bg', 'border-default');
            cell.dataset.row = String(r);
            cell.dataset.col = String(c);
            cell.addEventListener('click', handleClickDebounced);
            cellMap.set(`${r}-${c}`, cell);
            dom.boardEl.appendChild(cell);
        }
    }

    gameState.winningCells = [];
    gameState.isGameActive = true;
    gameState.currentPlayer = PLAYERS.HUMAN;
    gameState.isProcessingClick = false;

    document.body.classList.remove('win-overlay');
    updateStatusUI();
    closeModal();
    resetTimer();
}

// Khởi tạo game khi load trang
function init() {
    // Gán DOM
    dom.boardEl = document.getElementById('board');
    dom.statusEl = document.getElementById('status');
    dom.modeSelect = document.getElementById('modeSelect');
    dom.timerEl = document.getElementById('timer');
    dom.modalEl = document.getElementById('modal');
    dom.modalMessageEl = document.getElementById('modalMessage');
    dom.musicEl = document.getElementById('backgroundMusic');
    dom.toggleMusicBtn = document.getElementById('toggleMusic');
    dom.restartMainBtn = document.getElementById('restartMainButton');
    dom.restartModalBtn = document.getElementById('restartModalButton');
    dom.closeModalBtn = document.getElementById('closeModalButton');
    dom.savePlayersBtn = document.getElementById('savePlayersButton');
    dom.resetHistoryBtn = document.getElementById('resetHistoryButton');
    dom.playerNamesContainer = document.getElementById('playerNames');
    dom.nameXEl = document.getElementById('nameX');
    dom.nameOEl = document.getElementById('nameO');
    dom.playerXEl = document.getElementById('playerX');
    dom.playerOEl = document.getElementById('playerO');
    dom.scoreXEl = document.getElementById('scoreX');
    dom.scoreOEl = document.getElementById('scoreO');
    dom.scoreContainer = document.getElementById('scoreContainer');

    if (!checkAllDOMElements()) return;

    // Nhạc nền
    gameState.isMusicPlaying = localStorage.getItem('musicPlaying') === 'true';
    if (dom.musicEl) {
        dom.musicEl.loop = true;
        dom.musicEl.muted = !gameState.isMusicPlaying;
        if (gameState.isMusicPlaying) dom.musicEl.play().catch(() => {
        });
    }

    // Nút nhạc
    if (dom.toggleMusicBtn) {
        dom.toggleMusicBtn.innerHTML = gameState.isMusicPlaying
            ? '<i class="ti-control-stop"></i> Tắt nhạc'
            : '<i class="ti-control-play"></i> Bật nhạc';
        dom.toggleMusicBtn.classList.add(gameState.isMusicPlaying ? 'music-on' : 'music-off');
    }

    // Sự kiện
    dom.modeSelect.addEventListener('change', restartGame);
    dom.toggleMusicBtn.addEventListener('click', toggleMusic);
    dom.restartMainBtn.addEventListener('click', restartGame);
    dom.restartModalBtn.addEventListener('click', restartGame);
    dom.closeModalBtn.addEventListener('click', closeModal);
    dom.savePlayersBtn.addEventListener('click', savePlayers);
    dom.resetHistoryBtn.addEventListener('click', resetHistory);

    // Điểm số ban đầu
    const mode = gameState.mode;
    dom.scoreXEl.textContent = localStorage.getItem(`score_X_${mode}`) || "0";
    dom.scoreOEl.textContent = localStorage.getItem(`score_O_${mode}`) || "0";

    updatePlayerNames();
    createBoard();
}

window.onload = init;


/* X. CẬP NHẬT GIAO DIỆN TÊN & ĐIỂM */

// Cập nhật giao diện tên người chơi và điểm số
function updatePlayerNameVisibility() {
    if (dom.playerNamesContainer)
        dom.playerNamesContainer.style.display = gameState.mode === MODES.PVP ? 'flex' : 'none';

    if (dom.scoreContainer) {
        if (gameState.mode === MODES.PVP) {
            dom.scoreContainer.innerHTML = `
                <div class="score-x">
                    <span id="nameX">${localStorage.getItem("playerX") || "X"}</span>: 
                    <span id="scoreX">${localStorage.getItem("score_X_pvp") || "0"}</span>
                </div>
                <div class="score-o">
                    <span id="nameO">${localStorage.getItem("playerO") || "O"}</span>: 
                    <span id="scoreO">${localStorage.getItem("score_O_pvp") || "0"}</span>                    
                </div>`;
        } else {
            dom.scoreContainer.innerHTML = `
                <div class="score-x">
                    <span id="nameX">Bạn</span>: 
                    <span id="scoreX">${localStorage.getItem("score_X_pve") || "0"}</span>
                </div>
                <div class="score-o">
                    <span id="nameO">Máy</span>: 
                    <span id="scoreO">${localStorage.getItem("score_O_pve") || "0"}</span>
                </div>
                <button id="resetHistoryButtonPVE"><i class="ti-reload"></i> Reset</button>`;
        }

        // Gán lại DOM sau innerHTML
        dom.nameXEl = document.getElementById('nameX');
        dom.nameOEl = document.getElementById('nameO');
        dom.scoreXEl = document.getElementById('scoreX');
        dom.scoreOEl = document.getElementById('scoreO');

        // Gán sự kiện reset PVE
        const resetBtnPVE = document.getElementById('resetHistoryButtonPVE');
        if (resetBtnPVE) resetBtnPVE.addEventListener('click', resetHistory);
    }
}

// Làm mới điểm số từ localStorage
function refreshScoreUI() {
    const mode = gameState.mode;
    dom.scoreXEl.textContent = localStorage.getItem(`score_X_${mode}`) || "0";
    dom.scoreOEl.textContent = localStorage.getItem(`score_O_${mode}`) || "0";
}
