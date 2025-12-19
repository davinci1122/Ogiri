import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { generatePDF } from '../../utils/pdfGenerator';
import { ArrowRight, Trophy, Download, Play, Mic, Sparkles } from 'lucide-react';

export default function HostApp() {
    const { socket, isConnected } = useSocket();
    const [phase, setPhase] = useState('setup'); // setup, selection, game, result
    const [problem, setProblem] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [topics, setTopics] = useState([]);
    const [selectedTopic, setSelectedTopic] = useState('');
    const [answers, setAnswers] = useState([]);
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (!socket) return;

        socket.on('topics_generated', (generatedTopics) => {
            setTopics(generatedTopics);
            setIsGenerating(false);
            setPhase('selection');
        });

        socket.on('new_answer', (answer) => {
            setAnswers((prev) => [...prev, answer]);
        });

        socket.on('update_likes', ({ id, likes }) => {
            setAnswers((prev) => prev.map(a => a.id === id ? { ...a, likes } : a));
        });

        socket.on('game_finished', (data) => {
            setResult(data.result);
            setPhase('result');
        });

        return () => {
            socket.off('topics_generated');
            socket.off('new_answer');
            socket.off('update_likes');
            socket.off('game_finished');
        };
    }, [socket]);

    const handleProblemSubmit = () => {
        if (!problem.trim()) return;
        setIsGenerating(true);
        socket.emit('submit_problem', problem);
        socket.emit('host_join'); // Ensure host is registered
    };

    const handleTopicSelect = (topic) => {
        setSelectedTopic(topic);
        socket.emit('start_game', topic);
        setPhase('game');
    };

    const handleFinishGame = () => {
        socket.emit('finish_game');
    };

    const handleDownloadPDF = () => {
        generatePDF({
            problem,
            topic: selectedTopic,
            result,
            all_answers: answers
        });
    };

    return (
        <div className="min-h-screen bg-neutral-900 text-white font-sans overflow-hidden">
            {!isConnected && (
                <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-center p-2 z-50">
                    Connecting to server...
                </div>
            )}

            <div className="max-w-6xl mx-auto p-8 h-screen flex flex-col">
                {/* Header */}
                <header className="flex justify-between items-center mb-8 border-b border-neutral-700 pb-4">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text">
                        Oogiri Jam <span className="text-sm font-normal text-gray-400 ml-2">Host View</span>
                    </h1>
                    <div className="text-sm text-gray-500">Phase: {phase.toUpperCase()}</div>
                </header>

                {/* Content Area */}
                <main className="flex-1 relative min-h-0 overflow-hidden">
                    <AnimatePresence mode="wait">

                        {/* Setup Phase: Input Problem */}
                        {phase === 'setup' && (
                            <motion.div
                                key="setup"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="flex flex-col items-center justify-center h-full gap-8"
                            >
                                <div className="text-center space-y-4">
                                    <h2 className="text-4xl font-bold">解決したいビジネス課題は？</h2>
                                    <p className="text-gray-400">AIがそれを「笑いのお題」に変えます。</p>
                                </div>
                                <textarea
                                    className="w-full max-w-2xl bg-neutral-800 border border-neutral-700 rounded-xl p-6 text-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none h-40"
                                    placeholder="例: 若手の離職率が高い、会議が長い、etc..."
                                    value={problem}
                                    onChange={(e) => setProblem(e.target.value)}
                                />
                                <button
                                    onClick={handleProblemSubmit}
                                    disabled={isGenerating || !problem.trim()}
                                    className="px-8 py-4 bg-orange-600 hover:bg-orange-500 rounded-full text-xl font-bold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isGenerating ? 'AIが思考中...' : 'お題を生成する'} <ArrowRight />
                                </button>
                            </motion.div>
                        )}

                        {/* Selection Phase: Choose Topic */}
                        {phase === 'selection' && (
                            <motion.div
                                key="selection"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="h-full flex flex-col items-center"
                            >
                                <h2 className="text-3xl font-bold mb-12">お題を選択してください</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                                    {topics.map((t, i) => (
                                        <motion.button
                                            key={i}
                                            whileHover={{ scale: 1.05, borderColor: '#f97316' }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleTopicSelect(t)}
                                            className="p-8 bg-neutral-800 border-2 border-neutral-700 rounded-2xl text-left flex flex-col justify-between hover:bg-neutral-750 transition-colors h-64"
                                        >
                                            <span className="text-2xl font-bold leading-relaxed">{t}</span>
                                            <span className="text-gray-500 mt-4 text-sm">Select Topic {i + 1}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Game Phase */}
                        {phase === 'game' && (
                            <motion.div
                                key="game"
                                className="h-full flex flex-row gap-8"
                            >
                                {/* Left: QR and Topic */}
                                <div className="w-1/4 flex flex-col gap-8">
                                    <div className="bg-white p-4 rounded-xl w-fit mx-auto">
                                        <QRCodeSVG value={`${window.location.origin}/player`} size={180} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-gray-400 text-sm mb-2">Join at {window.location.origin}/player</p>
                                        <div className="bg-neutral-800 p-6 rounded-xl border border-orange-500/30">
                                            <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Current Topic</h3>
                                            <p className="text-xl font-bold text-orange-400">{selectedTopic}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleFinishGame}
                                        className="mt-auto w-full py-4 bg-red-600/20 text-red-500 border border-red-600/50 rounded-lg hover:bg-red-600 hover:text-white transition-colors uppercase tracking-widest font-bold"
                                    >
                                        Finish Game
                                    </button>
                                </div>

                                {/* Right: Answers Stream */}
                                <div className="flex-1 bg-neutral-800/50 rounded-3xl p-6 overflow-y-auto relative border border-neutral-700 min-h-0">
                                    <h3 className="text-gray-500 mb-4 sticky top-0 bg-neutral-900/90 p-2 z-10 backdrop-blur">
                                        Live Answers ({answers.length})
                                    </h3>
                                    <div className="space-y-6 flex flex-col">
                                        {[...answers].sort((a, b) => b.timestamp - a.timestamp).map((ans) => (
                                            <motion.div
                                                key={ans.id}
                                                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                layout
                                                className={`rounded-xl p-6 border shadow-xl relative overflow-hidden ${ans.isAi ? 'bg-neutral-800/80 border-purple-500/30' : 'bg-neutral-800 border-neutral-700'}`}
                                            >
                                                {/* AI Badge */}
                                                {ans.isAi && (
                                                    <div className="absolute top-0 right-0 bg-purple-600/20 text-purple-400 text-xs px-2 py-1 rounded-bl-lg border-b border-l border-purple-500/30">
                                                        AI Example
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-start mb-4">
                                                    <span className={`font-bold text-lg ${ans.isAi ? 'text-purple-400' : 'text-blue-400'}`}>{ans.nickname}</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full">
                                                            <span className="text-red-500 text-xl">❤️</span>
                                                            <span className="font-bold text-white">{ans.likes || 0}</span>
                                                        </div>
                                                        <span className="text-xs text-gray-600">Just now</span>
                                                    </div>
                                                </div>
                                                <p className="text-3xl font-black mb-6 text-white leading-tight">
                                                    {ans.deviation}
                                                </p>

                                                {/* AI Idea Section */}
                                                <div className="bg-black/40 rounded-lg p-4 border-l-4 border-yellow-500">
                                                    <div className="flex items-center gap-2 mb-1 text-yellow-500 font-bold">
                                                        <Sparkles size={16} /> Innovation Appraisal
                                                    </div>
                                                    <p className="text-yellow-100 font-bold text-lg mb-2">"{ans.tsukkomi}"</p>
                                                    <p className="text-green-400 text-sm flex items-start gap-2">
                                                        <span className="shrink-0 pt-1">🌱</span>
                                                        <span className="italic">Business Seed:</span> {ans.business_pivot}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        ))}
                                        {answers.length === 0 && (
                                            <div className="text-center text-gray-600 py-20">
                                                Waiting for answers...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Result Phase */}
                        {phase === 'result' && result && (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="h-full flex flex-col items-center justify-center gap-8"
                            >
                                <h2 className="text-5xl font-black text-center mb-8 uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">
                                    Results
                                </h2>

                                <div className="flex gap-8 w-full max-w-5xl">
                                    {/* Grand Prix */}
                                    <motion.div
                                        initial={{ y: 50, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="flex-1 bg-gradient-to-br from-yellow-900/40 to-black border border-yellow-500/50 p-8 rounded-3xl relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-20">
                                            <Trophy size={100} color="#fbbf24" />
                                        </div>
                                        <h3 className="text-yellow-500 font-bold tracking-widest uppercase mb-2">Grand Prix</h3>
                                        <p className="text-4xl font-bold mb-4">{result.grand_prix.nickname}</p>
                                        <p className="text-2xl mb-6">"{result.grand_prix.deviation}"</p>
                                        <p className="text-sm text-gray-400 border-t border-yellow-500/30 pt-4">
                                            {result.grand_prix.reason}
                                        </p>
                                    </motion.div>

                                    {/* Pivot Award */}
                                    <motion.div
                                        initial={{ y: 50, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        className="flex-1 bg-gradient-to-br from-blue-900/40 to-black border border-blue-500/50 p-8 rounded-3xl relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-20">
                                            <Trophy size={100} color="#3b82f6" />
                                        </div>
                                        <h3 className="text-blue-500 font-bold tracking-widest uppercase mb-2">Innovation Pivot</h3>
                                        <p className="text-4xl font-bold mb-4">{result.pivot_award.nickname}</p>
                                        <p className="text-2xl mb-6">"{result.pivot_award.deviation}"</p>
                                        <p className="text-sm text-gray-400 border-t border-blue-500/30 pt-4">
                                            {result.pivot_award.reason}
                                        </p>
                                    </motion.div>
                                </div>

                                <button
                                    onClick={handleDownloadPDF}
                                    className="mt-8 px-8 py-3 bg-white text-black rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200 transition"
                                >
                                    <Download size={20} /> Download Report (PDF)
                                </button>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
