import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';
import Navbar from './Navbar';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pt-10 pb-20 px-4 bg-zinc-950">
      <Navbar />
      <div className="max-w-2xl mx-auto text-center mt-20">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-zinc-900 border border-zinc-800 mb-8">
          <AlertCircle size={48} className="text-amber-500" />
        </div>
        <h1 className="text-6xl font-black text-white mb-4">404</h1>
        <h2 className="text-2xl font-bold text-zinc-300 mb-6">Page Not Found</h2>
        <p className="text-zinc-500 mb-10 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved. 
          You can search for users using the search bar or return home.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-500 transition-colors flex items-center gap-2"
          >
            <Home size={20} />
            Return Home
          </button>
          <button
            onClick={() => window.history.back()}
            className="bg-zinc-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-zinc-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
