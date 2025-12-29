import React, { useState, useEffect, useContext } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { Users, Eye, TrendingUp, Sparkles, Zap, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../App';
import Navbar from './Navbar';
import { toast } from 'react-toastify';

export default function Home() {
  const { globalStats, user } = useContext(UserContext);
  const [leaderboard, setLeaderboard] = useState([]);
  const [trendingUsers, setTrendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch most followed users
      const q1 = query(collection(db, "users"), orderBy("stats.followers", "desc"), limit(20));
      const snap1 = await getDocs(q1);
      const followedUsers = snap1.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Fetch most viewed users
      const q2 = query(collection(db, "users"), orderBy("stats.views", "desc"), limit(20));
      const snap2 = await getDocs(q2);
      const viewedUsers = snap2.docs.map(d => ({ id: d.id, ...d.data() }));

      // Simple trending algorithm (combine views + followers growth)
      const trending = [...followedUsers, ...viewedUsers]
        .reduce((acc, user) => {
          const existing = acc.find(u => u.id === user.id);
          if (!existing) acc.push(user);
          return acc;
        }, [])
        .sort((a, b) => {
          const scoreA = (a.stats?.views || 0) + (a.stats?.followers || 0) * 2;
          const scoreB = (b.stats?.views || 0) + (b.stats?.followers || 0) * 2;
          return scoreB - scoreA;
        })
        .slice(0, 10);

      setLeaderboard(followedUsers.slice(0, 10));
      setTrendingUsers(trending);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 pt-8">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-zinc-900 rounded-lg w-1/3 mx-auto"></div>
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              <div className="h-24 bg-zinc-900 rounded-xl"></div>
              <div className="h-24 bg-zinc-900 rounded-xl"></div>
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-zinc-900 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 pt-8">
        {/* Hero Section */}
        <div className="text-center space-y-8 mb-12">
          <div className="relative">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-gradient pb-2">
              Biolink<span className="text-indigo-500">.</span>
            </h1>
            <p className="text-zinc-400 font-mono text-sm uppercase tracking-widest mt-4">
              Curate your digital identity
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="glass p-6 rounded-2xl">
              <div className="flex items-center justify-center gap-3 text-indigo-400 mb-3">
                <Eye className="w-5 h-5"/>
                <span className="text-xs font-bold uppercase">Today's Visits</span>
              </div>
              <div className="text-3xl font-mono font-bold text-white">
                {globalStats.viewsToday?.toLocaleString() || '0'}
              </div>
            </div>
            <div className="glass p-6 rounded-2xl">
              <div className="flex items-center justify-center gap-3 text-emerald-400 mb-3">
                <Users className="w-5 h-5"/>
                <span className="text-xs font-bold uppercase">Total Users</span>
              </div>
              <div className="text-3xl font-mono font-bold text-white">
                {globalStats.users?.toLocaleString() || '0'}
              </div>
            </div>
            <div className="glass p-6 rounded-2xl">
              <div className="flex items-center justify-center gap-3 text-purple-400 mb-3">
                <Sparkles className="w-5 h-5"/>
                <span className="text-xs font-bold uppercase">All Time Views</span>
              </div>
              <div className="text-3xl font-mono font-bold text-white">
                {globalStats.totalViews?.toLocaleString() || '0'}
              </div>
            </div>
          </div>

          {!user && (
            <div className="max-w-md mx-auto">
              <button
                onClick={() => navigate('/auth')}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-8 rounded-xl hover:opacity-90 transition-opacity shadow-xl shadow-indigo-500/20"
              >
                Get Started - It's Free
              </button>
              <p className="text-zinc-500 text-sm mt-3">
                Join {globalStats.users?.toLocaleString() || '0'} users already on Biolink
              </p>
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Most Followed */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500"/>
                Most Followed
              </h2>
              <span className="text-xs text-zinc-500 font-mono">Leaderboard</span>
            </div>
            
            <div className="space-y-3">
              {leaderboard.map((user, index) => (
                <div
                  key={user.id}
                  onClick={() => navigate(`/${user.username}`)}
                  className="group flex items-center gap-4 p-4 bg-zinc-900/20 hover:bg-zinc-900 rounded-xl cursor-pointer transition-all border border-transparent hover:border-zinc-800"
                >
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                      index === 0 ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                      index === 1 ? 'bg-gradient-to-br from-zinc-500 to-zinc-700' :
                      index === 2 ? 'bg-gradient-to-br from-amber-700 to-amber-900' :
                      'bg-gradient-to-tr from-zinc-700 to-zinc-900'
                    }`}>
                      {user.displayName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    {index < 3 && (
                      <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-amber-500' :
                        index === 1 ? 'bg-zinc-500' :
                        'bg-amber-700'
                      }`}>
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">
                      {user.displayName || 'Unknown'}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      @{user.username}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors">
                      {user.stats?.followers?.toLocaleString() || '0'}
                    </div>
                    <div className="text-[10px] uppercase text-zinc-500 tracking-wider">
                      Followers
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Now */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-500"/>
                Trending Now
              </h2>
              <span className="text-xs text-zinc-500 font-mono">Hot Profiles</span>
            </div>
            
            <div className="space-y-3">
              {trendingUsers.map((user, index) => (
                <div
                  key={user.id}
                  onClick={() => navigate(`/${user.username}`)}
                  className="group flex items-center gap-4 p-4 bg-zinc-900/20 hover:bg-zinc-900 rounded-xl cursor-pointer transition-all border border-transparent hover:border-zinc-800"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white">
                    {user.displayName?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">
                      {user.displayName || 'Unknown'}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      @{user.username}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <div className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                        #{index + 1}
                      </div>
                    </div>
                    <div className="text-[10px] uppercase text-zinc-500 tracking-wider mt-1">
                      {((user.stats?.views || 0) + (user.stats?.followers || 0)).toLocaleString()} score
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 pt-12 border-t border-zinc-800">
          <h2 className="text-2xl font-bold text-center mb-10">Why Choose Biolink Pro?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="font-bold text-white mb-2">Real-time Analytics</h3>
              <p className="text-zinc-400 text-sm">
                Track views, clicks, and engagement with detailed analytics dashboard.
              </p>
            </div>
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-bold text-white mb-2">Social Network</h3>
              <p className="text-zinc-400 text-sm">
                Follow users, build your audience, and discover new connections.
              </p>
            </div>
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="font-bold text-white mb-2">Customizable</h3>
              <p className="text-zinc-400 text-sm">
                Personalize your profile with themes, links, and social connections.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-zinc-800 text-center">
          <p className="text-zinc-500 text-sm">
            © {new Date().getFullYear()} Biolink Pro. All rights reserved.
          </p>
          <p className="text-zinc-600 text-xs mt-2">
            Made with ❤️ for the digital creator community
          </p>
        </div>
      </div>
    </div>
  );
                }
