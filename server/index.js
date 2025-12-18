const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the React app build folder
app.use(express.static(path.join(__dirname, '../client/dist')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow mobile connection from LAN
        methods: ["GET", "POST"]
    }
});

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Game State
let gameState = {
    hostId: null,
    topic: null,
    answers: [], // { id, nickname, deviation, tsukkomi, business_pivot }
};

// Prompts
const TOPIC_GENERATION_PROMPT = `
【役割指定】
あなたはあらゆるユーザー入力を“大喜利のお題”に変換する専門AIです。
入力がビジネス課題・商品アイデア・社会現象・日常の悩み・抽象概念・一言ワードであっても、
必ず「ズレ」「皮肉」「誇張」を含む大喜利のお題に変換してください。

【内部変換ルール】
1. 入力をまず「人間の行動」に翻訳する
   - うまくいっていない行動
   - 勘違い・空回りしている努力
   - 温度差が生まれている場面
   - 本気とどうでもよさのズレ
   - 理想と現実のギャップ

2. タイプ別ズレ生成ルールを適用する
   - ビジネス／組織系: 現場と偉い人のズレ、改善している「つもり」、数字だけ追っている違和感
   - 商品／サービス系: 売りたい側と買わない側の温度差、気合の空回り、誰向けかわからない設計
   - 個人の悩み／感情: 本人の真剣さと周囲の無関心、解決策のズレ、余計な努力
   - 社会現象／抽象概念: 言葉だけが先行している状態、分かったふりしている違和感

3. お題フォーマット (必ず疑問文)
   - 「◯◯な状況で起きがちなこととは？」
   - 「◯◯がうまくいかない本当の理由とは？」
   - 「◯◯で一番余計なものとは？」
   - 「◯◯を本気でやった結果、ズレてしまったこととは？」
   - 「◯◯について、なぜか誰も言わない事実とは？」

【出力ルール】
- 説明・正論・結論は入れない (啓発・アドバイス禁止)
- 6つの異なるお題を生成する
- **必須: 結果は必ずJSON配列形式 ["お題1", "お題2", "お題3", "お題4", "お題5", "お題6"] で出力すること。** markdownのコードブロックは不要。
`;

const BUSINESS_IDEA_PROMPT = `
あなたは「イノベーション・カタリスト（変革の触媒）」です。
ユーザーの大喜利回答（ボケ）に対して、その独創性を最大限に肯定し、
飛躍した発想を「未来のビジネスチャンス」へと繋げる役割を担います。

以下の2段階対応をJSONで返してください。
1. praise_phrase: 回答の「着眼点の良さ」や「意外性」をポジティブに称賛する短いフレーズ。
2. business_pivot: そのボケを、実際にあり得る（あるいは夢のある）革新的なビジネスモデルやアイデアに簡潔に結びつける。

出力スキーマ:
{
  "praise_phrase": "string",
  "business_pivot": "string"
}
`;

const AWARDS_PROMPT = `
ゲーム終了です。これまでの回答リストから、以下の2つの賞を選出しJSONで返してください。
1. grand_prix: 笑いとビジネス可能性のバランスが良いもの。
2. pivot_award: 一見ふざけているが、AIの解釈(pivot)によって最大の跳躍(Innovation)を見せたもの。

回答リスト:
{{ANSWERS_JSON}}

出力スキーマ:
{
  "grand_prix": { "answer_id": "string", "reason": "string" },
  "pivot_award": { "answer_id": "string", "reason": "string" }
}
note: return only the answer objects as part of the structure, or ID references. Better: return the full object of the winner + reason.
Actually, better schema:
{
  "grand_prix_index": number (0-indexed index in the list),
  "grand_prix_reason": "string",
  "pivot_award_index": number (0-indexed index in the list),
  "pivot_award_reason": "string"
}
`;


// --- Logic ---

async function generateTopics(problem) {
    try {
        const result = await model.generateContent(`${TOPIC_GENERATION_PROMPT}\n\nビジネス課題: ${problem}`);
        const response = await result.response;
        const text = response.text();
        // Simple JSON extraction
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Gemini Error (Topics):", error);
        return [
            "AIがお昼寝中です。お題1",
            "AIがお昼寝中です。お題2",
            "AIがお昼寝中です。お題3",
            "AIがお昼寝中です。お題4",
            "AIがお昼寝中です。お題5",
            "AIがお昼寝中です。お題6"
        ];
    }
}

async function generateReaction(deviation, topic) {
    try {
        const prompt = `${BUSINESS_IDEA_PROMPT}\n\nお題: ${topic}\n回答: ${deviation}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Gemini Error (Reaction):", error);
        return { praise_phrase: "素晴らしい視点です！", business_pivot: "これは新しいマーケットを創出する可能性を秘めていますね。" };
    }
}

async function generateAwards(answers) {
    try {
        if (answers.length === 0) return null;
        const inputs = answers.map((a, i) => `${i}. 回答: ${a.deviation} / AI評価: ${a.business_pivot}`);
        const prompt = AWARDS_PROMPT.replace("{{ANSWERS_JSON}}", JSON.stringify(inputs, null, 2));

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Gemini Error (Awards):", error);
        return { grand_prix_index: 0, grand_prix_reason: "エラーのため選出", pivot_award_index: 0, pivot_award_reason: "エラーのため選出" };
    }
}

const EXAMPLE_ANSWER_PROMPT = `
お題に対して、少しズレた「ボケ回答」を2つ生成してください。
ユーモアがあり、かつ短めの回答をお願いします。
出力フォーマット:
["回答1", "回答2"]
JSON配列のみを返してください。
`;

// ... (Existing Prompts) ...

// --- Logic ---

async function generateExampleAnswers(topic) {
    try {
        const prompt = `${EXAMPLE_ANSWER_PROMPT}\n\nお題: ${topic}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Gemini Error (Examples):", error);
        return ["AIの模範回答1", "AIの模範回答2"];
    }
}

// ... (Existing generates) ...

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Host joins
    socket.on('host_join', () => {
        gameState.hostId = socket.id;
        socket.emit('game_state_update', gameState);
        console.log('Host registered:', socket.id);
    });

    // Host submits problem -> Generate Topics
    socket.on('submit_problem', async (problem) => {
        console.log('Problem received:', problem);
        const topics = await generateTopics(problem);
        socket.emit('topics_generated', topics);
    });

    // Host selects topic -> Start Game
    socket.on('start_game', async (selectedTopic) => {
        gameState.topic = selectedTopic;
        gameState.answers = [];
        io.emit('game_started', selectedTopic); // Notify everyone
        console.log('Game started with topic:', selectedTopic);

        // Generate AI Examples
        const examples = await generateExampleAnswers(selectedTopic);
        for (const ans of examples) {
            // Process AI answers just like player answers
            const aiResponse = await generateReaction(ans, selectedTopic);
            const entry = {
                id: 'AI_' + Date.now() + Math.random(),
                nickname: 'AI師匠',
                deviation: ans,
                tsukkomi: aiResponse.praise_phrase, // We'll keep the key 'tsukkomi' for now to avoid breaking the frontend until next step
                business_pivot: aiResponse.business_pivot,
                timestamp: Date.now(),
                isAi: true,
                likedBy: [] // Use array for easier JSON visualization/debugging, treat as Set logic
            };
            gameState.answers.push(entry);
            // Convert likedBy to likes count for client to avoid leaking IDs (?) 
            // Actually client just needs count. But let's send full object for simplicity, client shows length.
            // Wait, for privacy/security, maybe just send count? No, simple game.
            // Let's send the object as is, but modify client to read .length if it's an array, or server sends mapped object.
            // Easier: server keeps likedBy, emits 'likes' as number.

            // To be safe, emit 'new_answer' with 'likes' property as number.
            const clientEntry = { ...entry, likes: 0 };
            io.emit('new_answer', clientEntry);
        }
    });

    // Player joins
    socket.on('player_join', (nickname) => {
        // Just acknowledgement
        socket.emit('player_joined_ack', { topic: gameState.topic });
        // Send current answers to new player (map likedBy to likes count)
        const sanitizedAnswers = gameState.answers.map(a => ({
            ...a,
            likes: Array.isArray(a.likedBy) ? a.likedBy.length : 0
        }));
        socket.emit('connection_sync', { answers: sanitizedAnswers });
    });

    // Player submits answer
    socket.on('submit_answer', async (data) => {
        const { nickname, answer } = data;
        console.log(`Answer from ${nickname}: ${answer}`);

        // AI Processing
        const aiResponse = await generateReaction(answer, gameState.topic);

        const entry = {
            id: socket.id + Date.now(),
            nickname,
            deviation: answer,
            tsukkomi: aiResponse.praise_phrase, // Mirroring for frontend compatibility
            business_pivot: aiResponse.business_pivot,
            timestamp: Date.now(),
            likedBy: []
        };

        gameState.answers.push(entry);

        const clientEntry = { ...entry, likes: 0 };
        io.emit('new_answer', clientEntry);
    });

    // Like Answer (Toggle)
    socket.on('like_answer', (answerId) => {
        const answer = gameState.answers.find(a => a.id === answerId);
        if (answer) {
            if (!Array.isArray(answer.likedBy)) answer.likedBy = [];

            // Toggle Logic
            if (answer.likedBy.includes(socket.id)) {
                // Unlike: Remove socket.id
                console.log(`User ${socket.id} UNLIKED answer ${answerId}`);
                answer.likedBy = answer.likedBy.filter(id => id !== socket.id);
            } else {
                // Like: Add socket.id
                console.log(`User ${socket.id} LIKED answer ${answerId}`);
                answer.likedBy.push(socket.id);
            }
            // Emit new count
            console.log(`New count for ${answerId}: ${answer.likedBy.length}`);
            io.emit('update_likes', { id: answerId, likes: answer.likedBy.length });
        } else {
            console.log(`Answer ${answerId} not found!`);
        }
    });

    // Game Finish -> Awards
    socket.on('finish_game', async () => {
        console.log('Finishing game...');
        // Exclude AI answers from awards
        const playerAnswers = gameState.answers.filter(a => !a.isAi);

        const awards = await generateAwards(playerAnswers);
        // Map indices to actual objects (from the filtered list)

        let result = null;
        if (awards) {
            result = {
                grand_prix: {
                    ...playerAnswers[awards.grand_prix_index],
                    reason: awards.grand_prix_reason
                },
                pivot_award: {
                    ...playerAnswers[awards.pivot_award_index],
                    reason: awards.pivot_award_reason
                }
            };
        } else {
            // Fallback if no player answers
            result = {
                grand_prix: { nickname: "該当なし", deviation: "-", reason: "回答がありませんでした" },
                pivot_award: { nickname: "該当なし", deviation: "-", reason: "回答がありませんでした" }
            }
        }

        // Send full data for PDF (sanitize likes)
        const sanitizedAllAnswers = gameState.answers.map(a => ({
            ...a,
            likes: Array.isArray(a.likedBy) ? a.likedBy.length : 0
        }));

        io.emit('game_finished', { result, all_answers: sanitizedAllAnswers, topic: gameState.topic });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket.id === gameState.hostId) {
            gameState.hostId = null;
        }
    });
});

// 404 handler for API or other requests
// app.use((req, res) => res.status(404).send('Not Found'));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
