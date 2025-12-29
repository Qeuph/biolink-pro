import React, { useState, useEffect, useRef } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { setDoc, doc, serverTimestamp, query, where, getDocs, collection, runTransaction } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';

const ALLOWED_DOMAINS = ['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'proton.me', 'hotmail.com', 'me.com'];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  
  // Turnstile
  const [turnstileToken, setTurnstileToken] = useState(null);
  const turnstileRef = useRef(null);

  // Load Turnstile Script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  const validateEmail = (email) => {
    const domain = email.split('@')[1]?.toLowerCase();
    return ALLOWED_DOMAINS.includes(domain);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    if (!validateEmail(email)) {
      setMessage('Only reputable email providers (Gmail, Outlook, etc.) are allowed.');
      setLoading(false);
      return;
    }

    if (!turnstileToken && !isLogin) {
      setMessage('Please complete the security check.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/');
      } else {
        // 1. Check Username Uniqueness
        const q = query(collection(db, "users"), where("username", "==", username));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setMessage('Username is already taken.');
          setLoading(false);
          return;
        }

        // 2. Create Auth User
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        
        // 3. Create DB User + Update Global Count
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, "users", cred.user.uid);
          const globalRef = doc(db, "meta", "global");
          
          const globalDoc = await transaction.get(globalRef);
          if (!globalDoc.exists()) {
            transaction.set(globalRef, { users: 0, viewsToday: 0 });
          }

          transaction.set(userRef, {
            email,
            username: username.toLowerCase(),
            displayName: username,
            bio: "New to Biolink.",
            createdAt: serverTimestamp(),
            theme: "dark",
            links: [],
            connections: [],
            followers: [],
            following: [],
            stats: { views: 0, followers: 0, following: 0 }
          });

          transaction.update(globalRef, { users: globalDoc.exists() ? globalDoc.data().users + 1 : 1 });
        });

        setMessage('Account created! Redirecting...');
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (err) {
      setMessage(err.message.replace('Firebase: ', ''));
    }
    setLoading(false);
  };

  const handleForgot = async () => {
    if(!email) return setMessage('Enter your email first.');
    await sendPasswordResetEmail(auth, email);
    setMessage('Password reset email sent.');
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-60px)] p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        
        <div className="flex justify-center mb-6 text-indigo-400">
           <ShieldCheck size={48} />
        </div>
        
        <h1 className="text-2xl font-bold mb-2 text-center">{isLogin ? 'Identity Verification' : 'Initialize Account'}</h1>
        <p className="text-center text-zinc-500 text-sm mb-8">Secure access to the Biolink network.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400 uppercase">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="yourhandle"
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-400 uppercase">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="name@domain.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-400 uppercase">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {!isLogin && (
             <div className="flex justify-center py-2">
               <div ref={turnstileRef} className="cf-turnstile" data-sitekey="0x4AAAAAACJnG57IsX5NSqkm" data-callback={(token) => setTurnstileToken(token)}></div>
             </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors flex justify-center items-center mt-4">
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : (isLogin ? 'Authenticate' : 'Initialize')}
          </button>
        </form>

        {message && <p className="mt-4 text-center text-sm text-indigo-400">{message}</p>}

        <div className="mt-6 flex justify-between text-sm text-zinc-500">
          <button onClick={() => setIsLogin(!isLogin)} className="hover:text-white transition-colors">
            {isLogin ? "New user? Initialize" : "Existing? Login"}
          </button>
          {isLogin && <button onClick={handleForgot} className="hover:text-white transition-colors">Recover?</button>}
        </div>
      </div>
    </div>
  );
}
