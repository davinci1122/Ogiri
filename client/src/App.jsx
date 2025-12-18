import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HostApp from './pages/Host/HostApp';
import PlayerApp from './pages/Player/PlayerApp';

function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 text-white gap-8">
      <h1 className="text-6xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text">Oogiri Jam</h1>
      <div className="flex gap-4">
        <Link to="/host" className="px-8 py-4 bg-orange-600 rounded-lg text-xl font-bold hover:bg-orange-500 transition shadow-lg shadow-orange-500/20">
          ホストとして始める
        </Link>
        <Link to="/player" className="px-8 py-4 bg-blue-600 rounded-lg text-xl font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-500/20">
          プレイヤーとして参加
        </Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host/*" element={<HostApp />} />
        <Route path="/player/*" element={<PlayerApp />} />
      </Routes>
    </Router>
  );
}

export default App;
