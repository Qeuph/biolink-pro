import React, { createContext, useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Home = React.lazy(() => import('./components/Home'));
const Profile = React.lazy(() => import('./components/Profile'));
const Auth = React.lazy(() => import('./components/Auth'));
const NotFound = React.lazy(() => import('./components/NotFound'));

export const UserContext = createContext();

function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = (error) => {
      console.error('Application error:', error);
      setHasError(true);
      toast.error('Something went wrong. Please refresh the page.');
    };
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl text-white mb-4">Something went wrong</h1>
          <button 
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-500"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [globalStats, setGlobalStats] = useState({ users: 0, viewsToday: 0, totalViews: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth Listener with error handling
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);
        if (u) {
          const docRef = doc(db, "users", u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData({ id: u.uid, ...docSnap.data() });
          } else {
            setUserData(null);
          }
        } else {
          setUserData(null);
        }
      } catch (error) {
        console.error('Auth state error:', error);
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    });

    // Global Stats Listener (Realtime)
    const unsubStats = onSnapshot(doc(db, "meta", "global"), (doc) => {
      if (doc.exists()) {
        setGlobalStats(doc.data());
      }
    }, (error) => {
      console.error('Stats listener error:', error);
    });

    return () => {
      unsubAuth();
      unsubStats();
    };
  }, []);

  const LoadingScreen = () => (
    <div className="h-screen bg-zinc-950 text-zinc-500 flex items-center justify-center font-mono">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p>Loading System...</p>
      </div>
    </div>
  );

  if (loading) return <LoadingScreen />;

  return (
    <ErrorBoundary>
      <UserContext.Provider value={{ user, userData, setUserData, globalStats }}>
        <BrowserRouter>
          <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="dark"
            />
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
                <Route path="/:username" element={<Profile />} />
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" />} />
              </Routes>
            </Suspense>
          </div>
        </BrowserRouter>
      </UserContext.Provider>
    </ErrorBoundary>
  );
      }
