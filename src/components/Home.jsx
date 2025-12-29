import React, { useState, useEffect, useContext } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { Users, Eye, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../App';
import Navbar from './Navbar';

export default function Home() {
  const { globalStats } = useContext(UserContext);
  const [leaderboard, setLeaderboard] = useState([]);
  const [filter, setFilter] = useState('forever');
  const [tab, setTab] = useState('followed');
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaderboard();
  }, [filter, tab]);

  const fetchLeaderboard = async () => {
    let q = query(collection(db, "users"), orderBy("stats.followers", "desc"), limit(100));
    const snap = await getDocs(q);
    let users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    if (tab === 'viewed') {
      users.sort((a, b) => (b.stats?.views || 0) - (a.stats?.views || 0));
    }
    if (filter !== 'forever') {
      users.sort((a, b) => (b.lastLogin?.toMillis() || 0) - (a.lastLogin?.toMillis() || 0)); 
    }
    setLeaderboard(users);
  };

  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      
      <div className="animate-in fade-in duration-700 max-w-3xl mx-auto px-4 pt-8">
        {/* Hero */}
        <div className="text-center space-y-6 mb-12">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter bg-gradient-to-br from-white via-zinc-200 to-zinc-600 bg-clip-text text-transparent pb-2">
            Biolink.
          </h1>
          <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest">Curate your digital identity</p>
          
          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-center gap-2 text-indigo-400 mb-1"><Eye className="w-4 h-4"/> <span className="text-[10px] font-bold uppercase">Visits (Global)</span></div>
              <div className="text-3xl font-mono font-bold text-white">{globalStats.viewsToday}</div>
            </div>
            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-center gap-2 text-emerald-400 mb-1"><Users className="w-4 h-4"/> <span className="text-[10px] font-bold uppercase">Total Users</span></div>
              <div className="text-3xl font-mono font-bold text-white">{globalStats.users}</div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-500"/> Network Leaders</h2>
            <div className="flex flex-wrap items-center gap-2">
              {['forever', 'year', 'month', 'week', 'day', 'hour'].map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}>{f}</button>
              ))}
            </div>
          </div>

          <div className="flex gap-6 mb-6 border-b border-zinc-800">
            <button onClick={() => setTab('followed')} className={`pb-3 border-b-2 transition-colors ${tab === 'followed' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500'}`}>Most Followed</button>
            <button onClick={() => setTab('viewed')} className={`pb-3 border-b-2 transition-colors ${tab === 'viewed' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500'}`}>Most Viewed</button>
          </div>

          <div className="space-y-2">
            {leaderboard.map((u, i) => (
              <div key={u.id} onClick={() => navigate(`/${u.username}`)} className="group flex items-center gap-4 p-4 bg-zinc-900/20 hover:bg-zinc-900 rounded-xl cursor-pointer transition-all border border-transparent hover:border-zinc-800">
                <div className="font-mono text-zinc-600 w-8 text-right group-hover:text-indigo-500 transition-colors">#{i + 1}</div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-900 flex items-center justify-center text-xs font-bold text-white">{u.displayName.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0"><div className="font-bold text-white truncate">{u.displayName}</div><div className="text-xs text-zinc-500 truncate">@{u.username}</div></div>
                <div className="text-right"><div className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors">{tab === 'followed' ? (u.stats?.followers || 0) : (u.stats?.views || 0)}</div><div className="text-[10px] uppercase text-zinc-500 tracking-wider">{tab === 'followed' ? 'Followers' : 'Views'}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
