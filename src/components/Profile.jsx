import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment, runTransaction, query, collection, where, getDocs } from 'firebase/firestore';
import { UserContext } from '../App';
import { Edit3, Share2, Youtube, Gamepad2, Github, Twitter, Instagram, Linkedin, Twitch, Globe, Plus, X, Check, Eye, Copy, ExternalLink, Users, Heart, Calendar } from 'lucide-react';
import Navbar from './Navbar';
import { toast } from 'react-toastify';
import copy from 'copy-to-clipboard';

const iconMap = { 
  youtube: Youtube, 
  psn: Gamepad2, 
  xbox: Gamepad2, 
  discord: Globe, 
  github: Github, 
  twitter: Twitter, 
  instagram: Instagram, 
  linkedin: Linkedin, 
  twitch: Twitch,
  website: Globe 
};

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, userData, setUserData } = useContext(UserContext);
  
  const [profileData, setProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({});
  const [activeTab, setActiveTab] = useState('links');

  // Fetch Profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, "users"), where("username", "==", username.toLowerCase()));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const data = snap.docs[0].data();
          const id = snap.docs[0].id;
          
          // Convert Firestore timestamps
          const processedData = {
            id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            lastLogin: data.lastLogin?.toDate ? data.lastLogin.toDate() : data.lastLogin,
          };
          
          setProfileData(processedData);
          setEditForm({ 
            displayName: data.displayName, 
            bio: data.bio, 
            links: data.links || [], 
            connections: data.connections || [],
            theme: data.theme || 'dark'
          });
          
          // Increment User View
          try { 
            await updateDoc(doc(db, "users", id), { 
              "stats.views": increment(1),
              lastViewed: new Date()
            }); 
          } catch(e) {
            console.error('Failed to increment views:', e);
          }
          
          // Increment Global Visit
          try { 
            await updateDoc(doc(db, "meta", "global"), { 
              viewsToday: increment(1),
              totalViews: increment(1)
            }); 
          } catch(e) {
            console.error('Failed to update global stats:', e);
          }
        } else {
          setProfileData(null);
          navigate('/404');
        }
      } catch (error) {
        console.error('Profile fetch error:', error);
        toast.error('Failed to load profile');
        setProfileData(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [username, navigate]);

  const handleFollow = async () => {
    if (!user) {
      toast.error('Please login to follow users');
      navigate('/auth');
      return;
    }
    
    if (user.uid === profileData.id) {
      toast.info('You cannot follow yourself');
      return;
    }
    
    const myRef = doc(db, "users", user.uid);
    const theirRef = doc(db, "users", profileData.id);
    const isFollowing = userData?.following && userData.following.includes(profileData.id);

    try {
      await runTransaction(db, async (transaction) => {
        const myDoc = await transaction.get(myRef);
        const myData = myDoc.data();
        
        if (isFollowing) {
          transaction.update(myRef, { 
            following: arrayRemove(profileData.id), 
            "stats.following": increment(-1) 
          });
          transaction.update(theirRef, { 
            followers: arrayRemove(user.uid), 
            "stats.followers": increment(-1) 
          });
        } else {
          if ((myData.stats?.following || 0) >= 5000) {
            toast.error('You can only follow up to 5000 users');
            throw new Error('Following limit reached');
          }
          transaction.update(myRef, { 
            following: arrayUnion(profileData.id), 
            "stats.following": increment(1) 
          });
          transaction.update(theirRef, { 
            followers: arrayUnion(user.uid), 
            "stats.followers": increment(1) 
          });
        }
      });

      // Update local state
      if(isFollowing) {
        setUserData({
          ...userData,
          following: userData.following.filter(id => id !== profileData.id),
          stats: { ...userData.stats, following: (userData.stats?.following || 0) - 1 }
        });
        setProfileData({
          ...profileData,
          stats: { ...profileData.stats, followers: (profileData.stats?.followers || 0) - 1 },
          followers: (profileData.followers || []).filter(id => id !== user.uid)
        });
        toast.success(`Unfollowed ${profileData.displayName}`);
      } else {
        setUserData({
          ...userData,
          following: [...(userData.following || []), profileData.id],
          stats: { ...userData.stats, following: (userData.stats?.following || 0) + 1 }
        });
        setProfileData({
          ...profileData,
          stats: { ...profileData.stats, followers: (profileData.stats?.followers || 0) + 1 },
          followers: [...(profileData.followers || []), user.uid]
        });
        toast.success(`Following ${profileData.displayName}`);
      }

    } catch (e) {
      console.error('Follow error:', e);
      if (e.message !== 'Following limit reached') {
        toast.error('Failed to update follow status');
      }
    }
  };

  const saveProfile = async () => {
    try {
      const ref = doc(db, "users", profileData.id);
      await updateDoc(ref, { 
        displayName: editForm.displayName, 
        bio: editForm.bio, 
        links: editForm.links || [], 
        connections: editForm.connections || [],
        theme: editForm.theme,
        updatedAt: new Date()
      });
      setProfileData({ ...profileData, ...editForm });
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save profile');
    }
  };

  const copyProfileLink = () => {
    const url = `${window.location.origin}/${profileData.username}`;
    copy(url);
    toast.success('Profile link copied to clipboard!');
  };

  const handleLinkClick = async (linkIndex) => {
    if (!profileData.links[linkIndex]) return;
    
    const link = profileData.links[linkIndex];
    
    // Track click in database
    try {
      await updateDoc(doc(db, "users", profileData.id), {
        [`links.${linkIndex}.clicks`]: increment(1),
        "stats.clicks": increment(1)
      });
      
      // Update local state
      const updatedLinks = [...profileData.links];
      updatedLinks[linkIndex] = {
        ...updatedLinks[linkIndex],
        clicks: (updatedLinks[linkIndex].clicks || 0) + 1
      };
      
      setProfileData({
        ...profileData,
        links: updatedLinks,
        stats: {
          ...profileData.stats,
          clicks: (profileData.stats?.clicks || 0) + 1
        }
      });
      
      // Open link
      window.open(link.url, '_blank', 'noopener,noreferrer');
      
    } catch (error) {
      console.error('Failed to track click:', error);
      window.open(link.url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) return (
    <div className="min-h-screen pt-10 pb-20 px-4 bg-zinc-950">
      <Navbar />
      <div className="max-w-xl mx-auto mt-20 text-center">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-zinc-500 font-mono">Loading profile...</p>
      </div>
    </div>
  );

  if (!profileData) return (
    <div className="min-h-screen pt-10 pb-20 px-4 bg-zinc-950">
      <Navbar />
      <div className="max-w-xl mx-auto mt-20 text-center">
        <h1 className="text-2xl text-white mb-4">Profile Not Found</h1>
        <p className="text-zinc-500 mb-8">The user @{username} doesn't exist or has been removed.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-500"
        >
          Browse Profiles
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-10 pb-20 px-4 bg-zinc-950">
      <Navbar />
      <div className="max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex gap-6">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-2xl shadow-indigo-500/20">
                <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center text-3xl font-bold text-white">
                  {profileData.displayName.charAt(0).toUpperCase()}
                </div>
              </div>
              {profileData.verified && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-2 border-zinc-950">
                  <Check size={14} className="text-white" />
                </div>
              )}
            </div>
            <div className="pt-3 flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-black text-white tracking-tight">
                  {profileData.displayName}
                </h1>
                {profileData.premium && (
                  <span className="px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-xs font-bold rounded">
                    PRO
                  </span>
                )}
              </div>
              <p className="text-indigo-400 text-sm font-mono mb-3">@{profileData.username}</p>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">{profileData.bio}</p>
              
              <div className="flex flex-wrap gap-4 mt-5 text-sm">
                <div className="flex items-center gap-2">
                  <Eye size={14} className="text-zinc-500" />
                  <span className="text-white font-bold">{profileData.stats?.views || 0}</span>
                  <span className="text-zinc-600">Views</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-zinc-500" />
                  <span className="text-white font-bold">{profileData.stats?.followers || 0}</span>
                  <span className="text-zinc-600">Followers</span>
                </div>
                {userData && userData.id === profileData.id && (
                  <div className="flex items-center gap-2">
                    <Heart size={14} className="text-zinc-500" />
                    <span className="text-white font-bold">{profileData.stats?.following || 0}</span>
                    <span className="text-zinc-600">Following</span>
                  </div>
                )}
                {profileData.createdAt && (
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-zinc-500" />
                    <span className="text-zinc-600">
                      Joined {new Date(profileData.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {user && user.uid === profileData.id && (
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`p-3 rounded-xl transition-all ${isEditing ? 'bg-green-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
              >
                {isEditing ? <Check size={20}/> : <Edit3 size={20} />}
              </button>
            )}
            <button 
              onClick={copyProfileLink}
              className="p-3 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-xl transition-colors"
              title="Copy profile link"
            >
              <Copy size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 mb-6">
          <button
            onClick={() => setActiveTab('links')}
            className={`px-4 py-3 font-medium transition-colors ${activeTab === 'links' ? 'text-white border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Links
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`px-4 py-3 font-medium transition-colors ${activeTab === 'connections' ? 'text-white border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Connections
          </button>
          {userData && userData.id === profileData.id && (
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-3 font-medium transition-colors ${activeTab === 'analytics' ? 'text-white border-b-2 border-indigo-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Analytics
            </button>
          )}
        </div>

        {isEditing ? (
          <EditMode 
            profileData={profileData} 
            editForm={editForm} 
            setEditForm={setEditForm} 
            save={saveProfile} 
            cancel={() => setIsEditing(false)} 
          />
        ) : (
          <ViewMode 
            profileData={profileData} 
            activeTab={activeTab}
            handleFollow={handleFollow} 
            handleLinkClick={handleLinkClick}
            isOwner={user?.uid === profileData.id} 
            currentUser={user} 
            userData={userData} 
          />
        )}
      </div>
    </div>
  );
}

function EditMode({ profileData, editForm, setEditForm, save, cancel }) {
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [newConn, setNewConn] = useState({ type: 'youtube', value: '' });

  const addLink = () => {
    if (!newLink.title.trim() || !newLink.url.trim()) {
      toast.error('Please fill in both title and URL');
      return;
    }
    
    // Validate URL
    try {
      new URL(newLink.url);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }
    
    const updatedLinks = [...(editForm.links || []), { ...newLink, clicks: 0 }];
    setEditForm({ ...editForm, links: updatedLinks });
    setNewLink({ title: '', url: '' });
    toast.success('Link added');
  };

  const removeLink = (index) => {
    const updated = editForm.links.filter((_, i) => i !== index);
    setEditForm({ ...editForm, links: updated });
    toast.info('Link removed');
  };

  const addConnection = () => {
    if (!newConn.value.trim()) {
      toast.error('Please enter a username/ID');
      return;
    }
    
    const updatedConnections = [...(editForm.connections || []), newConn];
    setEditForm({ ...editForm, connections: updatedConnections });
    setNewConn({ type: 'youtube', value: '' });
    toast.success('Connection added');
  };

  const removeConnection = (index) => {
    const updated = editForm.connections.filter((_, i) => i !== index);
    setEditForm({ ...editForm, connections: updated });
    toast.info('Connection removed');
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
      {/* Basic Info */}
      <div className="space-y-4 bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Profile Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Display Name</label>
            <input
              value={editForm.displayName}
              onChange={e => setEditForm({...editForm, displayName: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white focus:border-indigo-500 outline-none transition-colors"
              placeholder="Your display name"
              maxLength={50}
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Bio</label>
            <textarea
              value={editForm.bio}
              onChange={e => setEditForm({...editForm, bio: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white h-32 focus:border-indigo-500 outline-none resize-none"
              placeholder="Tell others about yourself"
              maxLength={500}
            />
            <p className="text-xs text-zinc-500 mt-2 text-right">{editForm.bio?.length || 0}/500</p>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Theme</label>
            <select
              value={editForm.theme}
              onChange={e => setEditForm({...editForm, theme: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white focus:border-indigo-500 outline-none"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="purple">Purple</option>
              <option value="blue">Blue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="space-y-4 bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2">
            <Share2 size={14}/> Links
          </h3>
          <span className="text-xs text-zinc-500">{editForm.links?.length || 0} links</span>
        </div>
        
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="md:col-span-1 bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white text-sm focus:border-indigo-500 outline-none"
              placeholder="Link Title"
              value={newLink.title}
              onChange={e => setNewLink({...newLink, title: e.target.value})}
              maxLength={30}
            />
            <input
              className="md:col-span-2 bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white text-sm focus:border-indigo-500 outline-none"
              placeholder="https://example.com"
              value={newLink.url}
              onChange={e => setNewLink({...newLink, url: e.target.value})}
            />
          </div>
          <button
            onClick={addLink}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add Link
          </button>
        </div>

        <div className="space-y-2 mt-4">
          {editForm.links?.map((link, i) => (
            <div key={i} className="flex justify-between items-center bg-zinc-950 p-4 rounded-lg border border-zinc-800">
              <div className="flex-1 mr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium truncate">{link.title}</span>
                  {link.clicks > 0 && (
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                      {link.clicks} clicks
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-600 truncate">{link.url}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.open(link.url, '_blank')}
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                  title="Open link"
                >
                  <ExternalLink size={16} />
                </button>
                <button
                  onClick={() => removeLink(i)}
                  className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                  title="Remove link"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connections */}
      <div className="space-y-4 bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
        <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
          <Globe size={14}/> Social Connections
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            className="flex-1 bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white text-sm outline-none"
            value={newConn.type}
            onChange={e => setNewConn({...newConn, type: e.target.value})}
          >
            <option value="youtube">YouTube</option>
            <option value="twitter">Twitter</option>
            <option value="instagram">Instagram</option>
            <option value="github">GitHub</option>
            <option value="linkedin">LinkedIn</option>
            <option value="twitch">Twitch</option>
            <option value="discord">Discord</option>
            <option value="website">Website</option>
          </select>
          <input
            className="flex-2 bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white text-sm outline-none"
            placeholder="Username, URL, or ID"
            value={newConn.value}
            onChange={e => setNewConn({...newConn, value: e.target.value})}
          />
          <button
            onClick={addConnection}
            className="bg-emerald-600 text-white px-6 rounded-lg hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {editForm.connections?.map((conn, i) => {
            const IconComp = iconMap[conn.type] || Globe;
            return (
              <div key={i} className="px-3 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-sm flex items-center gap-2 text-white">
                <IconComp size={14} className="text-indigo-400"/>
                <span className="truncate max-w-[120px]">{conn.value}</span>
                <button
                  onClick={() => removeConnection(i)}
                  className="text-zinc-500 hover:text-white ml-1"
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={save}
          className="flex-1 bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors"
        >
          Save Changes
        </button>
        <button
          onClick={cancel}
          className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl hover:bg-zinc-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ViewMode({ profileData, activeTab, handleFollow, handleLinkClick, isOwner, currentUser, userData }) {
  const isFollowing = userData && userData.following && userData.following.includes(profileData.id);
  
  const renderLinks = () => (
    <div className="space-y-3">
      {profileData.links?.map((link, i) => (
        <button
          key={i}
          onClick={() => handleLinkClick(i)}
          className="block w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-indigo-500 hover:-translate-y-1 transition-all duration-300 text-left group"
        >
          <div className="flex justify-between items-center">
            <div>
              <span className="text-white font-medium group-hover:text-indigo-400 transition-colors">
                {link.title}
              </span>
              <div className="text-xs text-zinc-500 mt-1 truncate">{link.url}</div>
            </div>
            <div className="flex items-center gap-3">
              {link.clicks > 0 && (
                <span className="text-xs text-zinc-500">
                  {link.clicks} clicks
                </span>
              )}
              <ExternalLink size={16} className="text-zinc-500 group-hover:text-indigo-400" />
            </div>
          </div>
        </button>
      ))}
      {(!profileData.links || profileData.links.length === 0) && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Share2 size={24} className="text-zinc-600" />
          </div>
          <p className="text-zinc-600 font-mono text-sm">No links added yet</p>
          {isOwner && (
            <p className="text-zinc-500 text-sm mt-2">
              Edit your profile to add links
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderConnections = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {profileData.connections?.map((conn, i) => {
        const IconComp = iconMap[conn.type] || Globe;
        const getUrl = () => {
          const value = conn.value.toLowerCase();
          switch(conn.type) {
            case 'youtube': return `https://youtube.com/@${value}`;
            case 'twitter': return `https://twitter.com/${value}`;
            case 'instagram': return `https://instagram.com/${value}`;
            case 'github': return `https://github.com/${value}`;
            case 'linkedin': return `https://linkedin.com/in/${value}`;
            case 'twitch': return `https://twitch.tv/${value}`;
            default: return '#';
          }
        };
        
        return (
          <a
            key={i}
            href={getUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="aspect-square rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center hover:border-indigo-500 hover:bg-zinc-800 hover:scale-105 hover:text-indigo-400 transition-all duration-300 group"
          >
            <IconComp size={24} className="text-zinc-400 group-hover:text-indigo-400 mb-2 transition-colors" />
            <span className="text-xs font-medium text-white capitalize">{conn.type}</span>
            <span className="text-xs text-zinc-500 truncate max-w-full px-2">{conn.value}</span>
          </a>
        );
      })}
      {(!profileData.connections || profileData.connections.length === 0) && (
        <div className="col-span-full text-center py-12">
          <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe size={24} className="text-zinc-600" />
          </div>
          <p className="text-zinc-600 font-mono text-sm">No connections added</p>
        </div>
      )}
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Total Views</div>
          <div className="text-2xl font-bold text-white">{profileData.stats?.views || 0}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Link Clicks</div>
          <div className="text-2xl font-bold text-white">{profileData.stats?.clicks || 0}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Followers</div>
          <div className="text-2xl font-bold text-white">{profileData.stats?.followers || 0}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Following</div>
          <div className="text-2xl font-bold text-white">{profileData.stats?.following || 0}</div>
        </div>
      </div>
      
      {profileData.links && profileData.links.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <h3 className="font-bold text-white mb-4">Link Performance</h3>
          <div className="space-y-3">
            {profileData.links.map((link, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg">
                <div className="truncate flex-1 mr-4">
                  <div className="text-white font-medium truncate">{link.title}</div>
                  <div className="text-xs text-zinc-500 truncate">{link.url}</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">{link.clicks || 0}</div>
                  <div className="text-xs text-zinc-500">Clicks</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Action Buttons */}
      <div className="flex gap-3">
        {!isOwner && (
          <button
            onClick={handleFollow}
            className={`flex-1 font-bold py-3 rounded-xl transition-all ${isFollowing ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'}`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
        <button
          onClick={() => {
            const url = `${window.location.origin}/${profileData.username}`;
            copy(url);
            toast.success('Profile link copied!');
          }}
          className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 text-white"
        >
          <Share2 size={20} />
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'links' && renderLinks()}
      {activeTab === 'connections' && renderConnections()}
      {activeTab === 'analytics' && renderAnalytics()}
    </div>
  );
                            }
