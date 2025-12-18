import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';

const Firework = () => {
    const particles = Array.from({ length: 30 });
    return (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center isolate">
            {particles.map((_, i) => {
                const angle = Math.random() * 360;
                const distance = Math.random() * 300 + 100;
                const x = Math.cos(angle * Math.PI / 180) * distance;
                const y = Math.sin(angle * Math.PI / 180) * distance;
                const color = ['#ff0000', '#ffa500', '#ffff00', '#00ff00', '#00ffff', '#ff00ff'][Math.floor(Math.random() * 6)];

                return (
                    <motion.div
                        key={i}
                        initial={{ x: 0, y: 0, scale: 0 }}
                        animate={{
                            x,
                            y,
                            scale: [0, 1.5, 0],
                            opacity: [1, 1, 0]
                        }}
                        transition={{
                            duration: 0.8 + Math.random() * 0.5,
                            ease: [0.22, 1, 0.36, 1]
                        }}
                        className="absolute w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                    />
                );
            })}
        </div>
    );
};

export default function PlayerApp() {
    const { socket, isConnected } = useSocket();
    const [nickname, setNickname] = useState('');
    const [hasJoined, setHasJoined] = useState(false); // Renamed from isJoined
    const [topic, setTopic] = useState(null);
    const [answer, setAnswer] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false); // This state might become redundant or used differently

    // New: Firework Trigger
    const [showFirework, setShowFirework] = useState(false);

    const [answers, setAnswers] = useState([]);
    const [tension, setTension] = useState(false);

    useEffect(() => {
        if (!socket) return;

        socket.on('player_joined_ack', (data) => {
            setHasJoined(true);
            if (data.topic) setTopic(data.topic);
        });

        socket.on('game_started', (newTopic) => {
            setTopic(newTopic);
            setAnswers([]); // Reset for new game
            setIsSubmitted(false); // Keep this for the "Nice Boke!" message if needed
            setAnswer('');
        });

        socket.on('connection_sync', (data) => {
            if (data.answers) setAnswers(data.answers);
        });

        socket.on('new_answer', (answer) => {
            setAnswers((prev) => [...prev, answer]);
        });

        socket.on('update_likes', ({ id, likes }) => {
            setAnswers((prev) => prev.map(a => a.id === id ? { ...a, likes } : a));
        });

        return () => {
            socket.off('player_joined_ack');
            socket.off('game_started');
            socket.off('connection_sync');
            socket.off('new_answer');
            socket.off('update_likes');
        };
    }, [socket]);

    const handleJoin = () => {
        if (!nickname.trim()) return;
        socket.emit('player_join', nickname);
        // We wait for ack to setHasJoined(true)
    };

    const handleSubmit = () => {
        if (!answer.trim()) return;
        if (answer.length > 50) return; // Client-side check

        // Tension Animation
        async function playTension() {
            setTension(true);
            // Simulate "gathering energy"
            await new Promise(r => setTimeout(r, 800));
            setTension(false);

            // Release / Submit
            socket.emit('submit_answer', { nickname, answer });
            setAnswer('');
            setIsSubmitted(true); // Set this after submission for the "Nice Boke!" message

            // Trigger Firework
            setShowFirework(true);
            setTimeout(() => setShowFirework(false), 2000);
        }
        playTension();
    };

    const handleLike = (id) => {
        socket.emit('like_answer', id);
        // Optimistic update? No, let's wait for server to be safe, or just animate locally.
        // Server is fast enough.
    };

    if (!isConnected) {
        return <div className="h-screen flex items-center justify-center text-white">Connecting...</div>;
    }

    if (!hasJoined) {
        return (
            <div className="min-h-screen bg-black text-white p-8 flex flex-col justify-center max-w-md mx-auto">
                <h1 className="text-4xl font-black mb-8 text-center bg-gradient-to-r from-orange-400 to-red-500 text-transparent bg-clip-text">
                    Oogiri Jam
                </h1>
                <input
                    type="text"
                    className="w-full bg-neutral-800 border-2 border-neutral-700 rounded-xl p-4 text-xl text-center mb-6 focus:border-orange-500 outline-none"
                    placeholder="Nickname"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                />
                <button
                    onClick={handleJoin}
                    className="w-full py-4 bg-orange-600 rounded-full font-bold text-xl shadow-lg shadow-orange-900/50"
                >
                    JOIN GAME
                </button>
            </div>
        );
    }

    if (!topic) {
        return (
            <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center p-8">
                <div className="text-center animate-pulse">
                    <p className="text-2xl font-bold mb-2">Waiting for Host...</p>
                    <p className="text-gray-400">お題を待機中</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-900 text-white pb-20 overflow-hidden relative"> {/* pb-20 for scrolling space */}
            <AnimatePresence>
                {showFirework && <Firework />}
            </AnimatePresence>

            <div className="max-w-md mx-auto p-4 flex flex-col h-screen">

                {/* Fixed Header & Topic */}
                <div className="mb-4">
                    <div className="bg-neutral-800 p-4 rounded-xl border border-orange-500/30 shadow-lg">
                        <p className="text-xs text-orange-400 font-bold uppercase tracking-wider mb-1">Current Topic</p>
                        <p className="text-lg font-bold leading-snug">{topic}</p>
                    </div>
                </div>

                {/* Scrolable Timeline */}
                <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pb-48"> {/* pb-48 to not hide behind fixed input */}
                    {[...answers].reverse().map((ans) => (
                        <div key={ans.id} className={`p-4 rounded-xl border ${ans.isAi ? 'bg-purple-900/20 border-purple-500/30' : 'bg-neutral-800 border-neutral-700'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className={`font-bold text-sm ${ans.isAi ? 'text-purple-400' : 'text-blue-400'}`}>{ans.nickname}</span>
                                <span className="text-xs text-gray-500">
                                    {ans.isAi && "AI師匠"}
                                </span>
                            </div>
                            <p className="text-xl font-bold mb-3">{ans.deviation}</p>

                            <div className="flex justify-between items-center">
                                {/* AI Innovation Insight (Mini) */}
                                <div className="text-xs text-yellow-500 font-bold bg-black/30 px-2 py-1 rounded border border-yellow-500/20">
                                    ✨ {ans.tsukkomi}
                                </div>
                                <button
                                    onClick={() => handleLike(ans.id)}
                                    className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full active:scale-90 transition-transform"
                                >
                                    <span>❤️</span>
                                    <span className="font-bold">{ans.likes || 0}</span>
                                </button>
                            </div>
                        </div>
                    ))}
                    {answers.length === 0 && (
                        <div className="text-center text-gray-500 py-10">
                            No answers yet.<br />Be the first!
                        </div>
                    )}
                </div>

                {/* Fixed Input Area */}
                <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black to-transparent">
                    <div className="max-w-md mx-auto relative">
                        <AnimatePresence>
                            {/* Tension character removed per user request */}
                        </AnimatePresence>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 bg-neutral-800 border-2 border-neutral-600 rounded-full px-6 py-4 text-lg focus:border-orange-500 outline-none shadow-xl"
                                placeholder="ボケてください..."
                                value={answer}
                                onChange={e => setAnswer(e.target.value)}
                                disabled={tension}
                            />
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={handleSubmit}
                                disabled={!answer.trim()}
                                className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-900/50 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all font-bold text-white"
                            >
                                GO
                            </motion.button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
