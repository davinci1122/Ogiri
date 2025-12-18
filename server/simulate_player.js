const io = require('socket.io-client');
const socket = io('http://localhost:3000');

const NICKNAME = "TestPlayer";
const ANSWERS = [
    "部下が全員AIだった",
    "会議室がサウナだった",
    "社長が猫",
    "給料がドングリ"
];

socket.on('connect', () => {
    console.log('Player Connected:', socket.id);
    socket.emit('player_join', NICKNAME);
});

socket.on('game_started', (topic) => {
    console.log('Game Started! Topic:', topic);

    // DISABLE LOUD SIMULATION as per user request
    /*
    // Submit answers periodically
    let count = 0;
    const interval = setInterval(() => {
        if (count >= ANSWERS.length) {
            clearInterval(interval);
            return;
        }
        const ans = ANSWERS[count];
        console.log('Submitting answer:', ans);
        socket.emit('submit_answer', { nickname: NICKNAME, answer: ans });
        count++;
    }, 3000); 

    // Listen for new answers and randomly like them
    socket.on('new_answer', (entry) => {
        console.log('New answer received:', entry.deviation);
        if (Math.random() > 0.5) {
            setTimeout(() => {
                console.log('Liking answer:', entry.id);
                socket.emit('like_answer', entry.id);
            }, 1000 + Math.random() * 2000);
        }
    });
    */
    console.log("Simulated player is silent (AI Examples Check Mode)");
});

socket.on('game_finished', () => {
    console.log('Game Finished! Exiting...');
    setTimeout(() => process.exit(0), 1000);
});

console.log('Test Player Script Running...');
