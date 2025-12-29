import React, { useState, useEffect, useContext } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { Search, Users, Eye, Globe, TrendingUp, LogOut, UserPlus, LogIn, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../App';
import { auth } from '../lib/firebase';

export default function Home() {
  const { globalStats, user, userData } = useContext(UserContext);
  const [leaderboard, setLeaderboard] = useState([]);
  const [filter, setFilter] = useState('forever');
  const [tab, setTab] = useState('followed');
  const [searchQuery, setSearchQuery] = useState('');
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
      users.sort((a, b) => {
        const dateA = a.lastLogin?.toMillis() || 0;
        const dateB = b.lastLogin?.toMillis() || 0;
        return dateB - dateA; 
      });
    }

    setLeaderboard(users);
  };

  const filteredUsers = searchQuery 
    ? leaderboard.filter(u => 
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      ) 
    : leaderboard;

  return (
    <div className="pb-20 min-h-screen">
      
      {/* --- NAVIGATION BAR (NEW) --- */}
      <nav className="flex justify-between items-center px-6 py-4 sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900">
        <div onClick={() => navigate('/')} className="font-black text-xl tracking-tighter cursor-pointer text-white">
          Biolink<span className="text-indigo-500">.</span>
        </div>
        <div className="flex gap-3">
          {!user ? (
            <>
              <button onClick={() => navigate('/auth')} className="text-zinc-400 hover:text-white font-medium text-sm transition-colors flex items-center gap-2">
                <LogIn size={16} /> Login
              </button>
              <button onClick={() => navigate('/auth')} className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-zinc-200 transition-colors flex items-center gap-2">
                <UserPlus size={16} /> Sign Up
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate(`/${userData.username}`)} className="text-zinc-400 hover:text-white font-medium text-sm transition-colors flex items-center gap-2">
                <User size={16} /> Profile
              </button>
              <button onClick={() => auth.signOut()} className="text-zinc-400 hover:text-red-500 font-medium text-sm transition-colors flex items-center gap-2">
                <LogOut size={16} /> Logout
              </button>
            </>
          )}
        </div>
      </nav>
      {/* --- END NAVIGATION --- */}

      <div className="animate-in fade-in duration-700">
        {/* Hero Section */}
        <div className="p-8 text-center space-y-6 border-b border-zinc-900">
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-br from-white via-zinc-200 to-zinc-600 bg-clip-text text-transparent pb-2">
            Biolink.
          </h1>
          <p className="text-zinc-400 font-mono text-sm uppercase tracking-widest">Curate your digital identity</p>
          
          {/* Real Counters */}
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

          {/* Search */}
          <div className="relative max-w-md mx-auto mt-6 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-500 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input 
              type="text" 
              className="block w-full pl-10 pr-4 py-3 border border-zinc-800 rounded-xl leading-5 bg-zinc-900 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:bg-black focus:border-indigo-500 transition-all"
              placeholder="Search network..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Leaderboard */}
        <div className="max-w-3xl mx-auto px-4 pt-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500"/> Network Leaders
            </h2>
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-zinc-500 uppercase mr-2">Timeline:</span>
              {['forever', 'year', 'month', 'week', 'day', 'hour'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-6 mb-6 border-b border-zinc-800">
            <button onClick={() => setTab('followed')} className={`pb-3 border-b-2 transition-colors ${tab === 'followed' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500'}`}>Most Followed</button>
            <button onClick={() => setTab('viewed')} className={`pb-3 border-b-2 transition-colors ${tab === 'viewed' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500'}`}>Most Viewed</button>
          </div>

          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center text-zinc-600 py-10">No users found.</div>
            ) : (
              filteredUsers.map((u, i) => (
                <div key={u.id} onClick={() => navigate(`/${u.username}`)} className="group flex items-center gap-4 p-4 bg-zinc-900/20 hover:bg-zinc-900 rounded-xl cursor-pointer transition-all border border-transparent hover:border-zinc-800">
                  <div className="font-mono text-zinc-600 w-8 text-right group-hover:text-indigo-500 transition-colors">#{i + 1}</div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-900 flex items-center justify-center text-xs font-bold text-white">
                    {u.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{u.displayName}</div>
                    <div className="text-xs text-zinc-500 truncate">@{u.username}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors">
                      {tab === 'followed' ? (u.stats?.followers || 0) : (u.stats?.views || 0)}
                    </div>
                    <div className="text-[10px] uppercase text-zinc-500 tracking-wider">{tab === 'followed' ? 'Followers' : 'Views'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
