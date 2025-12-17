import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Trash2,
  Plus,
  Lock,
  Unlock,
  Search,
  Users,
  UserPlus,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Download,
  Upload,
  Sparkles
} from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:3001/api';

// Toast notification component
const Toast = ({ message, type, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 20, scale: 0.9 }}
    className={`toast toast-${type}`}
  >
    {type === 'success' && <Check size={18} />}
    {type === 'error' && <AlertCircle size={18} />}
    {type === 'info' && <Sparkles size={18} />}
    <span>{message}</span>
    <button onClick={onClose} className="toast-close">
      <X size={14} />
    </button>
  </motion.div>
);

// Username card component
const UsernameCard = ({ user, onDelete, onCopy, isLocked, copiedId }) => {
  const isCopied = copiedId === user.id;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: -20 }}
      transition={{ duration: 0.2 }}
      className="username-card"
    >
      <div className="username-info">
        <span className="username-handle">@{user.username}</span>
        {user.display_name && (
          <span className="username-display">{user.display_name}</span>
        )}
      </div>
      
      <div className="username-actions">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className={`action-btn copy-btn ${isCopied ? 'copied' : ''}`}
          onClick={() => onCopy(user)}
          title="Copy username"
        >
          {isCopied ? <Check size={16} /> : <Copy size={16} />}
        </motion.button>
        
        <motion.a
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          href={`https://x.com/${user.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="action-btn link-btn"
          title="Open on X"
        >
          <ExternalLink size={16} />
        </motion.a>
        
        {!isLocked && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="action-btn delete-btn"
            onClick={() => onDelete(user.id)}
            title="Remove username"
          >
            <Trash2 size={16} />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

// Main App
function App() {
  const [activeTab, setActiveTab] = useState('following');
  const [usernames, setUsernames] = useState({ following: [], followers: [] });
  const [isLocked, setIsLocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [stats, setStats] = useState({ following: 0, followers: 0 });
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Toast helpers
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Fetch all usernames
  const fetchUsernames = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/usernames`);
      const data = await response.json();
      
      if (data.success) {
        const grouped = {
          following: data.data.filter(u => u.list_type === 'following'),
          followers: data.data.filter(u => u.list_type === 'followers')
        };
        setUsernames(grouped);
        setStats({
          following: grouped.following.length,
          followers: grouped.followers.length
        });
      }
    } catch (error) {
      console.error('Error fetching usernames:', error);
      addToast('Failed to load usernames', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchUsernames();
  }, [fetchUsernames]);

  // Add username
  const handleAddUsername = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || isLocked) return;

    try {
      const response = await fetch(`${API_BASE}/usernames`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          list_type: activeTab
        })
      });

      const data = await response.json();

      if (data.success) {
        setUsernames(prev => ({
          ...prev,
          [activeTab]: [data.data, ...prev[activeTab]]
        }));
        setStats(prev => ({ ...prev, [activeTab]: prev[activeTab] + 1 }));
        setNewUsername('');
        addToast(`@${data.data.username} added to ${activeTab}`, 'success');
      } else {
        addToast(data.error || 'Failed to add username', 'error');
      }
    } catch (error) {
      console.error('Error adding username:', error);
      addToast('Failed to add username', 'error');
    }
  };

  // Bulk add usernames
  const handleBulkAdd = async () => {
    if (!bulkInput.trim() || isLocked) return;

    // Split by newlines, commas, or spaces and clean up
    const usernameList = bulkInput
      .split(/[\n,\s]+/)
      .map(u => u.trim().replace(/^@/, ''))
      .filter(u => u.length > 0);

    if (usernameList.length === 0) {
      addToast('No valid usernames found', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/usernames/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernames: usernameList,
          list_type: activeTab
        })
      });

      const data = await response.json();

      if (data.success) {
        fetchUsernames();
        setBulkInput('');
        setShowBulkModal(false);
        addToast(`Added ${data.imported} of ${data.total} usernames`, 'success');
      } else {
        addToast(data.error || 'Failed to import', 'error');
      }
    } catch (error) {
      console.error('Error bulk adding:', error);
      addToast('Failed to bulk add usernames', 'error');
    }
  };

  // Delete username
  const handleDelete = async (id) => {
    if (isLocked) return;

    try {
      const response = await fetch(`${API_BASE}/usernames/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setUsernames(prev => ({
          ...prev,
          [activeTab]: prev[activeTab].filter(u => u.id !== id)
        }));
        setStats(prev => ({ ...prev, [activeTab]: prev[activeTab] - 1 }));
        addToast('Username removed', 'info');
      }
    } catch (error) {
      console.error('Error deleting username:', error);
      addToast('Failed to remove username', 'error');
    }
  };

  // Copy username
  const handleCopy = async (user) => {
    try {
      await navigator.clipboard.writeText(`@${user.username}`);
      setCopiedId(user.id);
      addToast(`Copied @${user.username}`, 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Error copying:', error);
      addToast('Failed to copy', 'error');
    }
  };

  // Copy all usernames
  const handleCopyAll = async () => {
    const currentList = filteredUsernames;
    if (currentList.length === 0) return;

    const allUsernames = currentList.map(u => `@${u.username}`).join('\n');
    try {
      await navigator.clipboard.writeText(allUsernames);
      addToast(`Copied ${currentList.length} usernames`, 'success');
    } catch (error) {
      console.error('Error copying all:', error);
      addToast('Failed to copy all', 'error');
    }
  };

  // Export to JSON
  const handleExport = () => {
    const dataToExport = {
      following: usernames.following,
      followers: usernames.followers,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `x-usernames-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Exported successfully', 'success');
  };

  // Import from JSON
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        
        // Import following
        if (imported.following && imported.following.length > 0) {
          const followingUsernames = imported.following.map(u => u.username || u);
          await fetch(`${API_BASE}/usernames/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: followingUsernames, list_type: 'following' })
          });
        }
        
        // Import followers
        if (imported.followers && imported.followers.length > 0) {
          const followersUsernames = imported.followers.map(u => u.username || u);
          await fetch(`${API_BASE}/usernames/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: followersUsernames, list_type: 'followers' })
          });
        }
        
        fetchUsernames();
        addToast('Import successful', 'success');
      } catch (error) {
        console.error('Import error:', error);
        addToast('Invalid import file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filter usernames by search
  const filteredUsernames = usernames[activeTab].filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.display_name && user.display_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="app">
      {/* Background effects */}
      <div className="bg-gradient"></div>
      <div className="bg-grid"></div>
      
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">𝕏</div>
            <div className="logo-text">
              <h1>Username Manager</h1>
              <p>Manage your X connections</p>
            </div>
          </div>
          
          <div className="header-actions">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`lock-btn ${isLocked ? 'locked' : ''}`}
              onClick={() => {
                setIsLocked(!isLocked);
                addToast(isLocked ? 'Unlocked - editing enabled' : 'Locked - read-only mode', 'info');
              }}
            >
              {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
              <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="main">
        {/* Stats bar */}
        <div className="stats-bar">
          <div className="stat">
            <UserPlus size={18} />
            <span className="stat-value">{stats.following}</span>
            <span className="stat-label">Following</span>
          </div>
          <div className="stat">
            <Users size={18} />
            <span className="stat-value">{stats.followers}</span>
            <span className="stat-label">Followers</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'following' ? 'active' : ''}`}
            onClick={() => setActiveTab('following')}
          >
            <UserPlus size={18} />
            Following
            <span className="tab-count">{stats.following}</span>
          </button>
          <button
            className={`tab ${activeTab === 'followers' ? 'active' : ''}`}
            onClick={() => setActiveTab('followers')}
          >
            <Users size={18} />
            Followers
            <span className="tab-count">{stats.followers}</span>
          </button>
        </div>

        {/* Controls */}
        <div className="controls">
          {/* Search */}
          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search usernames..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => setSearchQuery('')}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Add form */}
          {!isLocked && (
            <form onSubmit={handleAddUsername} className="add-form">
              <input
                type="text"
                placeholder="Add @username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="add-input"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="add-btn"
                disabled={!newUsername.trim()}
              >
                <Plus size={20} />
              </motion.button>
            </form>
          )}
        </div>

        {/* Action buttons */}
        <div className="bulk-actions">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bulk-btn"
            onClick={handleCopyAll}
            disabled={filteredUsernames.length === 0}
          >
            <Copy size={16} />
            Copy All ({filteredUsernames.length})
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bulk-btn"
            onClick={handleExport}
          >
            <Download size={16} />
            Export
          </motion.button>
          
          {!isLocked && (
            <label className="bulk-btn import-btn">
              <Upload size={16} />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </label>
          )}

          {!isLocked && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bulk-btn bulk-add-btn"
              onClick={() => setShowBulkModal(true)}
            >
              <Plus size={16} />
              Bulk Add
            </motion.button>
          )}
        </div>

        {/* Username list */}
        <div className="username-list">
          {isLoading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading usernames...</p>
            </div>
          ) : filteredUsernames.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                {searchQuery ? <Search size={48} /> : <Users size={48} />}
              </div>
              <h3>{searchQuery ? 'No results found' : `No ${activeTab} yet`}</h3>
              <p>
                {searchQuery
                  ? 'Try a different search term'
                  : `Add your first ${activeTab === 'following' ? 'following' : 'follower'} above`}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredUsernames.map((user) => (
                <UsernameCard
                  key={user.id}
                  user={user}
                  onDelete={handleDelete}
                  onCopy={handleCopy}
                  isLocked={isLocked}
                  copiedId={copiedId}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Bulk Add Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowBulkModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Bulk Add Usernames</h2>
                <button className="modal-close" onClick={() => setShowBulkModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <p className="modal-hint">
                  Paste usernames separated by commas, spaces, or new lines.
                  The @ symbol is optional.
                </p>
                <textarea
                  className="bulk-textarea"
                  placeholder={"@user1, @user2, @user3\nor\nuser1\nuser2\nuser3"}
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  rows={8}
                />
                <div className="modal-info">
                  Adding to: <span className="modal-tab-name">{activeTab}</span>
                </div>
              </div>
              <div className="modal-footer">
                <button className="modal-btn cancel" onClick={() => setShowBulkModal(false)}>
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="modal-btn confirm"
                  onClick={handleBulkAdd}
                  disabled={!bulkInput.trim()}
                >
                  Add Usernames
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast container */}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;