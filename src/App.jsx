import React, { createContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

import Home from './components/Home';
import Profile from './components/Profile';
import Auth from './components/Auth';

export const UserContext = createContext();

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [globalStats, setGlobalStats] = useState({ users: 0, viewsToday: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth Listener
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, "users", u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setUserData({ id: u.uid, ...docSnap.data() });
        else setUserData(null);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    // Global Stats Listener (Realtime)
    const unsubStats = onSnapshot(doc(db, "meta", "global"), (doc) => {
      if(doc.exists()) setGlobalStats(doc.data());
    });

    return () => { unsubAuth(); unsubStats(); };
  }, []);

  if (loading) return <div className="h-screen bg-zinc-950 text-zinc-500 flex items-center justify-center font-mono">Loading System...</div>;

  return (
    <UserContext.Provider value={{ user, userData, setUserData, globalStats }}>
      <BrowserRouter>
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
            <Route path="/:username" element={<Profile />} />
          </Routes>
        </div>
      </BrowserRouter>
    </UserContext.Provider>
  );
}
