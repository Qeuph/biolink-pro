import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment, runTransaction, query, collection, where, getDocs } from 'firebase/firestore';
import { UserContext } from '../App';
import { Edit3, Share2, Youtube, Gamepad2, Github, Twitter, Instagram, Linkedin, Twitch, Globe, Plus, X, Check } from 'lucide-react';

const iconMap = { youtube: Youtube, psn: Gamepad2, xbox: Gamepad2, discord: Globe, github: Github, twitter: Twitter, instagram: Instagram, linkedin: Linkedin, twitch: Twitch };

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, userData } = useContext(UserContext);
  
  const [profileData, setProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({});

  // Fetch Profile - FIXED INFINITE LOOP
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, "users"), where("username", "==", username));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const data = snap.docs[0].data();
          const id = snap.docs[0].id;
          setProfileData({ id, ...data });
          setEditForm({ 
            displayName: data.displayName, 
            bio: data.bio, 
            links: data.links || [], 
            connections: data.connections || [] 
          });
          
          // Increment View
          try {
            await updateDoc(doc(db, "users", id), { "stats.views": increment(1) });
          } catch (e) {
            // Silent fail to not break UI
          }
        } else {
          setProfileData(null); // User not found
        }
      } catch (error) {
        console.error("Profile fetch error:", error);
        setProfileData(null);
      } finally {
        // ALWAYS STOP LOADING
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  const handleFollow = async () => {
    if (!user) return alert('Authentication required.');
    if (user.uid === profileData.id) return;
    
    const myRef = doc(db, "users", user.uid);
    const theirRef = doc(db, "users", profileData.id);

    try {
      await runTransaction(db, async (transaction) => {
        const myDoc = await transaction.get(myRef);
        const myData = myDoc.data();
        
        if (myData.following && myData.following.includes(profileData.id)) {
          transaction.update(myRef, { following: arrayRemove(profileData.id), "stats.following": increment(-1) });
          transaction.update(theirRef, { followers: arrayRemove(user.uid), "stats.followers": increment(-1) });
        } else {
          if ((myData.stats?.following || 0) >= 5000) {
            alert("Maximum following limit reached (5000).");
            return;
          }
          transaction.update(myRef, { following: arrayUnion(profileData.id), "stats.following": increment(1) });
          transaction.update(theirRef, { followers: arrayUnion(user.uid), "stats.followers": increment(1) });
        }
      });
      alert("Action Successful!");
    } catch (e) {
      console.error(e);
      alert("Could not perform action.");
    }
  };

  const saveProfile = async () => {
    const ref = doc(db, "users", profileData.id);
    await updateDoc(ref, {
      displayName: editForm.displayName,
      bio: editForm.bio,
      links: editForm.links || [],
      connections: editForm.connections || []
    });
    setProfileData({ ...profileData, ...editForm });
    setIsEditing(false);
  };

  if (loading) return <div className="p-20 text-center text-zinc-500 animate-pulse">Accessing Node...</div>;
  if (!profileData) return <div className="p-20 text-center text-zinc-500 font-mono">404: Entity Not Found</div>;

  return (
    <div className="min-h-screen pt-10 pb-20 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div className="flex gap-6">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-2xl shadow-indigo-500/20">
              <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center text-3xl font-bold text-white">
                {profileData.displayName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="pt-3">
              <h1 className="text-3xl font-black text-white tracking-tight">{profileData.displayName}</h1>
              <p className="text-indigo-400 text-sm font-mono mb-3">@{profileData.username}</p>
              <p className="text-zinc-400 text-sm max-w-xs leading-relaxed font-light">{profileData.bio}</p>
              <div className="flex gap-6 mt-5 text-sm">
                <span className="text-white font-bold">{profileData.stats?.followers || 0} <span className="text-zinc-600 font-normal">Followers</span></span>
                <span className="text-white font-bold">{profileData.stats?.views || 0} <span className="text-zinc-600 font-normal">Views</span></span>
                {userData && userData.id === profileData.id && (
                   <span className="text-white font-bold">{profileData.stats?.following || 0} <span className="text-zinc-600 font-normal">Following</span></span>
                )}
              </div>
            </div>
          </div>
          {user && user.uid === profileData.id && (
            <button onClick={() => setIsEditing(!isEditing)} className={`p-3 rounded-xl transition-all ${isEditing ? 'bg-green-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
              {isEditing ? <Check size={20}/> : <Edit3 size={20} />}
            </button>
          )}
        </div>
        {isEditing ? (
          <EditMode profileData={profileData} editForm={editForm} setEditForm={setEditForm} save={saveProfile} cancel={() => setIsEditing(false)} />
        ) : (
          <ViewMode profileData={profileData} handleFollow={handleFollow} isOwner={user?.uid === profileData.id} currentUser={user} userData={userData} />
        )}
      </div>
    </div>
  );
}

// --- EDIT MODE ---
function EditMode({ profileData, editForm, setEditForm, save, cancel }) {
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [newConn, setNewConn] = useState({ type: 'youtube', value: '' });

  const addLink = () => {
    if(!newLink.title || !newLink.url) return;
    setEditForm({ ...editForm, links: [...(editForm.links || []), { ...newLink, clicks: 0 }] });
    setNewLink({ title: '', url: '' });
  };

  const removeLink = (index) => {
    const updated = editForm.links.filter((_, i) => i !== index);
    setEditForm({ ...editForm, links: updated });
  };

  const addConnection = () => {
    if(!newConn.value) return;
    setEditForm({ ...editForm, connections: [...(editForm.connections || []), newConn] });
    setNewConn({ type: 'youtube', value: '' });
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
      <div className="space-y-4 bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Identity Data</h3>
        <input className="w-full bg-black border border-zinc-800 p-3 rounded-lg text-white focus:border-indigo-500 outline-none transition-colors" value={editForm.displayName} onChange={e => setEditForm({...editForm, displayName: e.target.value})} placeholder="Display Name" />
        <textarea className="w-full bg-black border border-zinc-800 p-3 rounded-lg text-white h-24 focus:border-indigo-500 outline-none resize-none" onChange={e => setEditForm({...editForm, bio: e.target.value})}>{editForm.bio}</textarea>
      </div>

      <div className="space-y-4 bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2"><Share2 size={14}/> Linked Content</h3>
        </div>
        <div className="flex gap-2">
          <input className="flex-1 bg-black border border-zinc-800 p-3 rounded-lg text-white text-sm focus:border-indigo-500 outline-none" placeholder="Title" value={newLink.title} onChange={e => setNewLink({...newLink, title: e.target.value})} />
          <input className="flex-1 bg-black border border-zinc-800 p-3 rounded-lg text-white text-sm focus:border-indigo-500 outline-none" placeholder="URL" value={newLink.url} onChange={e => setNewLink({...newLink, url: e.target.value})} />
          <button onClick={addLink} className="bg-indigo-600 text-white px-4 rounded-lg hover:bg-indigo-500 transition-colors"><Plus size={18}/></button>
        </div>
        <div className="space-y-2">
          {editForm.links?.map((l, i) => (
            <div key={i} className="flex justify-between items-center bg-black p-3 rounded-lg border border-zinc-800">
              <span className="text-sm truncate flex-1 mr-4"><span className="text-white font-medium">{l.title}</span> <span className="text-zinc-600 text-xs">({l.url})</span></span>
              <button onClick={() => removeLink(i)} className="text-zinc-500 hover:text-red-500 transition-colors"><X size={16}/></button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
        <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2"><Globe size={14}/> Connected Accounts</h3>
        <div className="flex gap-2">
          <select className="bg-black border border-zinc-800 p-3 rounded-lg text-white text-sm outline-none" value={newConn.type} onChange={e => setNewConn({...newConn, type: e.target.value})}>
            <option value="youtube">YouTube</option>
            <option value="psn">PlayStation</option>
            <option value="xbox">Xbox</option>
            <option value="discord">Discord</option>
            <option value="github">GitHub</option>
            <option value="twitter">X (Twitter)</option>
          </select>
          <input className="flex-1 bg-black border border-zinc-800 p-3 rounded-lg text-white text-sm outline-none" placeholder="Username/ID" value={newConn.value} onChange={e => setNewConn({...newConn, value: e.target.value})} />
          <button onClick={addConnection} className="bg-emerald-600 text-white px-4 rounded-lg hover:bg-emerald-500 transition-colors"><Plus size={18}/></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {editForm.connections?.map((c, i) => {
            const IconComp = iconMap[c.type] || Globe;
            return (
              <span key={i} className="px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs flex items-center gap-2 text-white">
                <IconComp size={12} className="text-indigo-400"/> {c.value}
                <button onClick={() => { const up = {...editForm, connections: editForm.connections.filter((_, x) => x !== i)}; setEditForm(up); }} className="text-zinc-500 hover:text-white">&times;</button>
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={save} className="flex-1 bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors">Save Changes</button>
        <button onClick={cancel} className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl hover:bg-zinc-700 transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// --- VIEW MODE ---
function ViewMode({ profileData, handleFollow, isOwner, currentUser, userData }) {
  const isFollowing = userData && userData.following && userData.following.includes(profileData.id);
  return (
    <div className="space-y-8 animate-in fade-in">
      {profileData.connections && profileData.connections.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center">
          {profileData.connections.map((c, i) => {
            const IconComp = iconMap[c.type] || Globe;
            return (
              <a key={i} href="#" className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:border-indigo-500 hover:bg-zinc-800 hover:scale-110 hover:text-indigo-400 hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 group" title={`Connected: ${c.type}`}>
                 <IconComp size={20} className="text-zinc-400 group-hover:text-indigo-400 transition-colors"/>
              </a>
            );
          })}
        </div>
      )}
      <div className="flex gap-3">
        {!isOwner && (
          <button onClick={handleFollow} className={`flex-1 font-bold py-3 rounded-xl transition-all ${isFollowing ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'}`}>
            {isFollowing ? 'Following' : 'Follow User'}
          </button>
        )}
        <button className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 text-white"><Share2 size={20} /></button>
      </div>
      <div className="space-y-3">
        {profileData.links?.map((link, i) => (
          <a 
            key={i} 
            href={link.url} 
            target="_blank" 
            className="block w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-indigo-500 hover:-translate-y-1 transition-all duration-300 text-center group"
          >
            <span className="text-white font-medium group-hover:text-indigo-400 transition-colors">{link.title}</span>
          </a>
        ))}
        {(!profileData.links || profileData.links.length === 0) && (
          <div className="text-center text-zinc-600 py-10 font-mono text-xs">[NO_LINKS_DETECTED]</div>
        )}
      </div>
    </div>
  );
}
