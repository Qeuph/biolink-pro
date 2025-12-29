import React, { useState, useEffect, useRef } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db, validateUsername, validateEmailDomain } from '../lib/firebase';
import { setDoc, doc, serverTimestamp, query, where, getDocs, collection, runTransaction } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, Mail, ShieldCheck, RefreshCw, Eye, EyeOff } from 'lucide-react';
import Navbar from './Navbar';
import { toast } from 'react-toastify';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const turnstileRef = useRef(null);

  useEffect(() => {
    if (window.turnstile) { 
      setTurnstileLoaded(true); 
      return; 
    }
    
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true; 
    script.defer = true;
    script.onload = () => {
      setTurnstileLoaded(true);
      if (turnstileRef.current && !turnstileToken && !isLogin) {
        window.turnstile.render('#turnstile-container', { 
          sitekey: '0x4AAAAAACJnG57IsX5NSqkm', 
          callback: (token) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(null),
          'error-callback': () => setTurnstileToken(null)
        });
      }
    };
    script.onerror = () => {
      console.error('Failed to load Turnstile script');
      toast.error('Security check failed to load. Please refresh.');
    };
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (turnstileLoaded && turnstileRef.current && !isLogin) {
      turnstileRef.current.innerHTML = '';
      window.turnstile.render('#turnstile-container', { 
        sitekey: '0x4AAAAAACJnG57IsX5NSqkm', 
        callback: (token) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(null)
      });
    }
  }, [isLogin, turnstileLoaded]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Username Logic for Login
    let emailToUse = email;
    if (isLogin && !email.includes('@')) {
      const q = query(collection(db, "users"), where("username", "==", email.toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.error('User not found.');
        setLoading(false);
        return;
      }
      emailToUse = snap.docs[0].data().email;
    }

    if (!isLogin) {
      // Validation
      if (!validateEmailDomain(email)) {
        toast.error('Please use a reputable email provider.');
        setLoading(false);
        return;
      }
      if (!validateUsername(username)) {
        toast.error('Username must be 3-30 characters, letters, numbers, and underscores only.');
        setLoading(false);
        return;
      }
      if (password.length < 8) {
        toast.error('Password must be at least 8 characters.');
        setLoading(false);
        return;
      }
      if (!turnstileToken) {
        toast.error('Please complete the security check.');
        setLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, emailToUse, password);
        toast.success('Welcome back!');
        navigate('/');
      } else {
        // Check if username exists
        const q = query(collection(db, "users"), where("username", "==", username.toLowerCase()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          toast.error('Username already taken.');
          setLoading(false);
          return;
        }

        // Create user
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, "users", cred.user.uid);
          const globalRef = doc(db, "meta", "global");
          const globalDoc = await transaction.get(globalRef);
          
          const userData = {
            email,
            username: username.toLowerCase(),
            displayName: username,
            bio: "Welcome to my Biolink profile!",
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            theme: "dark",
            links: [],
            connections: [],
            followers: [],
            following: [],
            stats: { 
              views: 0, 
              followers: 0, 
              following: 0,
              clicks: 0 
            },
            verified: false,
            premium: false
          };

          if (!globalDoc.exists()) {
            transaction.set(globalRef, { 
              users: 1, 
              viewsToday: 0,
              totalViews: 0 
            });
          } else {
            transaction.update(globalRef, { 
              users: globalDoc.data().users + 1 
            });
          }
          
          transaction.set(userRef, userData);
        });

        toast.success('Account created successfully!');
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (err) {
      const errorMsg = err.code ? err.code.replace('auth/', '').replace(/-/g, ' ') : err.message;
      toast.error(errorMsg.charAt(0).toUpperCase() + errorMsg.slice(1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-10 pb-20 px-4 bg-zinc-950">
      <Navbar />
      <div className="flex items-center justify-center max-w-md mx-auto mt-10">
        <div className="w-full bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="flex justify-center mb-6 text-indigo-400">
            <ShieldCheck size={48} />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-center">
            {isLogin ? 'Identity Verification' : 'Initialize Account'}
          </h1>
          <p className="text-center text-zinc-500 text-sm mb-8">
            {isLogin ? 'Access your digital identity' : 'Create your Biolink presence'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase">Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="yourhandle"
                  required 
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_]+"
                  title="Letters, numbers, and underscores only"
                />
                <p className="text-xs text-zinc-500 mt-1">3-30 characters, letters, numbers, underscores</p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400 uppercase">
                {isLogin ? 'Email or Username' : 'Email'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <input 
                  type="text" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder={isLogin ? "name@domain.com or username" : "name@domain.com"}
                  required 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400 uppercase">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-12 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 h-4 w-4 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {!isLogin && (
                <p className="text-xs text-zinc-500 mt-1">At least 8 characters</p>
              )}
            </div>

            {!isLogin && (
              <div className="flex justify-center py-4 min-h-[65px]">
                <div 
                  id="turnstile-container" 
                  ref={turnstileRef} 
                  className="cf-turnstile"
                />
                {!turnstileLoaded && (
                  <div className="text-xs text-zinc-500 flex items-center gap-2">
                    <RefreshCw size={10} className="animate-spin"/> 
                    Loading security...
                  </div>
                )}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center mt-4"
            >
              {loading ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                isLogin ? 'Authenticate' : 'Initialize Account'
              )}
            </button>
          </form>

          <div className="mt-6 flex justify-between text-sm text-zinc-500">
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setEmail('');
                setPassword('');
                setUsername('');
                setTurnstileToken(null);
              }}
              className="hover:text-white transition-colors"
            >
              {isLogin ? "New user? Initialize" : "Existing? Login"}
            </button>
            {isLogin && (
              <button 
                onClick={async() => { 
                  if(!email.includes('@')) {
                    toast.error('Please enter your email address first.');
                    return;
                  }
                  try {
                    await sendPasswordResetEmail(auth, email);
                    toast.success('Password reset email sent!');
                  } catch (error) {
                    toast.error('Failed to send reset email.');
                  }
                }}
                className="hover:text-white transition-colors"
              >
                Forgot password?
              </button>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 text-center">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
      }
