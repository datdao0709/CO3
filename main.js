// I. CẤU HÌNH & HẰNG SỐ
// Định nghĩa các hằng số và cấu hình cơ bản cho trò chơi
const config = {
    BOARD_SIZE: 15,
    WINNING_LENGTH: 5,
    TURN_TIME: 20,
    AI_DELAY: 300,
    DEBOUNCE_TIME: 100,
};

const PLAYERS = {
    HUMAN: 'X',
    AI: 'O',
};

const MODES = {
    PVP: 'pvp',
    PVE: 'pve',
};

const SOUNDS = {
    WIN: 'sound-win',
    LOSE: 'sound-lose',
    DRAW: 'sound-draw',
};

// II. TRẠNG THÁI TRÒ CHƠI
// Quản lý trạng thái trò chơi và các phần tử DOM
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
    musicPausedByModal: false,
};

// III. CÁC HÀM XỬ LÝ GIAO DIỆN (UI)

// Cập nhật giao diện ô cờ
function updateCellUI(row, col, player) {
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
        cell.textContent = player;
        cell.classList.add(player === PLAYERS.HUMAN ? 'x-color' : 'o-color');
    }
}

// Cập nhật trạng thái lượt chơi
function updateStatusUI() {
    dom.statusEl.textContent = `Đến lượt: ${gameState.currentPlayer}`;
    dom.statusEl.classList.remove('x-color', 'o-color', 'win-color');
    dom.statusEl.classList.add(gameState.currentPlayer === PLAYERS.HUMAN ? 'x-color' : 'o-color');
}

// Làm nổi bật các ô thắng
function highlightWinningCellsUI() {
    gameState.winningCells.forEach(([row, col]) => {
        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            cell.classList.add('win-color', 'win-shadow', 'disabled');
        }
    });
    document.body.classList.add('win-overlay');
    document.querySelectorAll('.cell').forEach(cell => cell.classList.add('disabled'));
}

// Hiển thị modal thông báo và tạm dừng nhạc
function showModal(message) {
    dom.modalMessageEl.textContent = message;
    dom.modalEl.classList.remove('hidden');
    if (gameState.isMusicPlaying) {
        dom.musicEl.pause();
        dom.musicPausedByModal = true;
    }
}

// Đóng modal và tiếp tục nhạc nếu cần
function closeModal() {
    dom.modalEl.classList.add('hidden');
    if (dom.musicPausedByModal && gameState.isMusicPlaying) {
        dom.musicEl.play().catch(() => console.warn("Cần tương tác để bật nhạc."));
        dom.musicPausedByModal = false;
    }
}

// Bật/tắt nhạc nền
function toggleMusic() {
    gameState.isMusicPlaying = !gameState.isMusicPlaying;
    dom.musicEl.muted = !gameState.isMusicPlaying;
    localStorage.setItem('musicPlaying', String(gameState.isMusicPlaying));

    if (gameState.isMusicPlaying) {
        dom.musicEl.play().catch(() => console.warn("Cần tương tác để bật nhạc."));
        dom.toggleMusicBtn.textContent = 'Tắt nhạc';
        dom.toggleMusicBtn.classList.add('music-on');
        dom.toggleMusicBtn.classList.remove('music-off');
    } else {
        dom.musicEl.pause();
        dom.toggleMusicBtn.textContent = 'Bật nhạc';
        dom.toggleMusicBtn.classList.add('music-off');
        dom.toggleMusicBtn.classList.remove('music-on');
    }
}

// Phát âm thanh hiệu ứng
function playSound(soundId) {
    const soundEl = document.getElementById(soundId);
    if (soundEl) {
        soundEl.currentTime = 0;
        soundEl.play().catch(error => console.error(`Lỗi phát âm thanh ${soundId}:`, error));
    }
}

// IV. CÁC HÀM LOGIC CHÍNH CỦA GAME

// Ngăn chặn click liên tục
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Kiểm tra tọa độ hợp lệ trên bàn cờ
function isInBounds(r, c) {
    return r >= 0 && r < config.BOARD_SIZE && c >= 0 && c < config.BOARD_SIZE;
}

// Chuyển lượt người chơi
function switchPlayer() {
    gameState.currentPlayer = gameState.currentPlayer === PLAYERS.HUMAN ? PLAYERS.AI : PLAYERS.HUMAN;
    updateStatusUI();
    startTimer();
}

// Xử lý khi có người thắng
function handleWin() {
    gameState.isGameActive = false;
    const sound = (gameState.mode === MODES.PVP || gameState.currentPlayer === PLAYERS.HUMAN) ? SOUNDS.WIN : SOUNDS.LOSE;
    playSound(sound);
    highlightWinningCellsUI();
    dom.statusEl.textContent = `${gameState.currentPlayer} thắng!`;
    const message = gameState.mode === MODES.PVP
        ? `Người chơi ${gameState.currentPlayer} thắng!`
        : (gameState.currentPlayer === PLAYERS.HUMAN ? 'Bạn thắng!' : 'Máy thắng!');
    showModal(message);
    resetTimer();
}

// Xử lý khi hòa
function handleDraw() {
    gameState.isGameActive = false;
    playSound(SOUNDS.DRAW);
    dom.statusEl.textContent = 'Hòa!';
    showModal('Trò chơi hòa! Không có người thắng.');
    resetTimer();
}

// Kiểm tra điều kiện thắng
function checkWin(row, col) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const {dx, dy} of directions.map(d => ({dx: d[0], dy: d[1]}))) {
        let count = 1;
        let connectedCells = [[row, col]];
        for (const step of [-1, 1]) {
            for (let i = 1; i < config.WINNING_LENGTH; i++) {
                const r = row + step * i * dx;
                const c = col + step * i * dy;
                if (isInBounds(r, c) && gameState.board[r][c] === gameState.currentPlayer) {
                    count++;
                    connectedCells.push([r, c]);
                } else {
                    break;
                }
            }
        }
        if (count >= config.WINNING_LENGTH) {
            gameState.winningCells = connectedCells;
            return true;
        }
    }
    return false;
}

// Xử lý nước đi của người chơi
function placeMove(row, col) {
    if (gameState.board[row][col] !== '') return;

    gameState.board[row][col] = gameState.currentPlayer;
    updateCellUI(row, col, gameState.currentPlayer);

    const emptyCellIndex = gameState.emptyCells.findIndex(([r, c]) => r === row && c === col);
    if (emptyCellIndex > -1) gameState.emptyCells.splice(emptyCellIndex, 1);

    if (checkWin(row, col)) {
        handleWin();
        return;
    }

    if (gameState.emptyCells.length === 0) {
        handleDraw();
        return;
    }

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

// Xử lý sự kiện click ô cờ
function handleClick(e) {
    if (gameState.isProcessingClick || !gameState.isGameActive) return;
    gameState.isProcessingClick = true;

    try {
        const row = Number(e.target.dataset.row);
        const col = Number(e.target.dataset.col);
        placeMove(row, col);
    } catch (error) {
        console.error('Lỗi khi xử lý click:', error);
        gameState.isProcessingClick = false;
    }
}

// Khởi động bộ đếm thời gian
function startTimer() {
    resetTimer();
    gameState.timeLeft = config.TURN_TIME;
    dom.timerEl.textContent = String(gameState.timeLeft);
    gameState.timerInterval = setInterval(() => {
        gameState.timeLeft--;
        dom.timerEl.textContent = String(gameState.timeLeft);
        if (gameState.timeLeft <= 0) {
            handleTimeout();
        }
    }, 1000);
}

// Dừng và reset bộ đếm thời gian
function resetTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    gameState.timeLeft = config.TURN_TIME;
    dom.timerEl.textContent = String(gameState.timeLeft);
}

// Xử lý khi hết thời gian
function handleTimeout() {
    resetTimer();
    const winner = gameState.currentPlayer === PLAYERS.HUMAN ? PLAYERS.AI : PLAYERS.HUMAN;
    gameState.isGameActive = false;
    dom.statusEl.textContent = `Hết giờ! ${winner} thắng!`;
    showModal(`Hết giờ! Người chơi ${winner} thắng!`);
    document.querySelectorAll('.cell').forEach(cell => cell.classList.add('disabled'));
}

// V. LOGIC CHO AI

// AI thực hiện nước đi
function aiMove() {
    if (!gameState.isGameActive) return;

    let bestMove = {row: -1, col: -1};
    let bestScore = -Infinity;

    for (const [row, col] of gameState.emptyCells) {
        gameState.board[row][col] = PLAYERS.AI;
        const scoreForAI = evaluatePosition(row, col, PLAYERS.AI);
        gameState.board[row][col] = PLAYERS.HUMAN;
        const scoreForHuman = evaluatePosition(row, col, PLAYERS.HUMAN);
        gameState.board[row][col] = '';

        const currentScore = scoreForAI + scoreForHuman * 1.1;

        if (currentScore > bestScore) {
            bestScore = currentScore;
            bestMove = {row, col};
        }
    }

    if (bestMove.row !== -1) {
        placeMove(bestMove.row, bestMove.col);
    }
}

// Đánh giá điểm số cho vị trí
function evaluatePosition(row, col, player) {
    let totalScore = 0;
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dx, dy] of directions) {
        totalScore += evaluateDirection(row, col, dx, dy, player);
    }
    return totalScore;
}

// Đánh giá điểm theo một hướng cụ thể
function evaluateDirection(row, col, dx, dy, player) {
    let consecutive = 0;
    let openEnds = 0;

    for (let i = 1; i < config.WINNING_LENGTH; i++) {
        const r = row + i * dx;
        const c = col + i * dy;
        if (isInBounds(r, c) && gameState.board[r][c] === player) {
            consecutive++;
        } else if (isInBounds(r, c) && gameState.board[r][c] === '') {
            openEnds++;
            break;
        } else {
            break;
        }
    }

    for (let i = 1; i < config.WINNING_LENGTH; i++) {
        const r = row - i * dx;
        const c = col - i * dy;
        if (isInBounds(r, c) && gameState.board[r][c] === player) {
            consecutive++;
        } else if (isInBounds(r, c) && gameState.board[r][c] === '') {
            openEnds++;
            break;
        } else {
            break;
        }
    }

    consecutive++;

    if (consecutive >= config.WINNING_LENGTH) return 100000;
    if (consecutive === 4 && openEnds === 2) return 50000;
    if (consecutive === 4 && openEnds === 1) return 10000;
    if (consecutive === 3 && openEnds === 2) return 5000;
    if (consecutive === 3 && openEnds === 1) return 100;
    if (consecutive === 2 && openEnds === 2) return 50;

    return consecutive;
}

// VI. KHỞI TẠO TRÒ CHƠI

// Khởi động lại trò chơi
function restartGame() {
    gameState.mode = dom.modeSelect.value;
    createBoard();
}

// Tạo bàn cờ ban đầu
function createBoard() {
    dom.boardEl.innerHTML = '';
    gameState.board = Array.from({length: config.BOARD_SIZE}, () => Array(config.BOARD_SIZE).fill(''));
    gameState.emptyCells = [];
    for (let r = 0; r < config.BOARD_SIZE; r++) {
        for (let c = 0; c < config.BOARD_SIZE; c++) {
            gameState.emptyCells.push([r, c]);
            const cell = document.createElement('div');
            cell.className = 'cell board-bg border-default';
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener('click', debounce(handleClick, config.DEBOUNCE_TIME));
            dom.boardEl.appendChild(cell);
        }
    }

    gameState.winningCells = [];
    gameState.isGameActive = true;
    gameState.currentPlayer = PLAYERS.HUMAN;
    gameState.isProcessingClick = false;

    updateStatusUI();
    document.body.classList.remove('win-overlay');
    closeModal();
    resetTimer();
}

// Khởi tạo trò chơi khi trang tải
function init() {
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

    if (Object.values(dom).some(el => el === null)) {
        console.error("Lỗi: Một hoặc nhiều phần tử DOM không được tìm thấy.");
        return;
    }

    dom.modeSelect.addEventListener('change', restartGame);
    dom.toggleMusicBtn.addEventListener('click', toggleMusic);
    dom.restartMainBtn.addEventListener('click', restartGame);
    dom.restartModalBtn.addEventListener('click', restartGame);
    dom.closeModalBtn.addEventListener('click', closeModal);

    gameState.isMusicPlaying = false;
    localStorage.setItem('musicPlaying', 'false');
    dom.toggleMusicBtn.textContent = 'Bật nhạc';
    dom.toggleMusicBtn.classList.add('music-off');
    dom.toggleMusicBtn.classList.remove('music-on');
    dom.musicEl.muted = true;
    dom.musicEl.loop = true;
    dom.musicEl.play().catch(() => {
    });

    createBoard();
}

window.onload = init;