import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LogOut, LogIn, UserPlus, User } from 'lucide-react';
import { UserContext } from '../App';

export default function Navbar() {
  const { user, userData } = useContext(UserContext);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/${searchQuery.trim()}`);
      setSearchQuery('');
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 px-4 py-3">
      <div className="max-w-3xl mx-auto flex justify-between items-center gap-4">
        {/* Logo */}
        <div onClick={() => navigate('/')} className="font-black text-xl cursor-pointer flex-shrink-0">
          Biolink<span className="text-indigo-500">.</span>
        </div>

        {/* Search Bar (Visible on ALL pages) */}
        <div className="flex-1 max-w-md relative group">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500 group-focus-within:text-indigo-500" />
          <input 
            type="text" 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            placeholder="Search user..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <button onClick={() => navigate('/auth')} className="hidden sm:flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors">
                <LogIn size={16} /> Login
              </button>
              <button onClick={() => navigate('/auth')} className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-indigo-500 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                <UserPlus size={16} /> Sign Up
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate(`/${userData.username}`)} className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors">
                <User size={16} /> Profile
              </button>
              <button onClick={() => navigate('/auth')} className="text-zinc-400 hover:text-red-500 transition-colors">
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
