import React, { useState, useEffect } from 'react';
import CanvasBoard from './components/CanvasBoard';
import CodeEditor from './components/CodeEditor';
import SessionReplayBar from './components/SessionReplayBar';
import socket from './socket';

function App() {
  const [replayFrame, setReplayFrame] = useState(0);
  const [peerCount, setPeerCount] = useState(1);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sync_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    socket.emit('join-room', 'demo-room');

    socket.on('room-users', (count) => {
      setPeerCount(count);
    });

    return () => {
      socket.off('room-users');
    };
  }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister 
      ? { name: authName, email: authEmail, password: authPassword }
      : { email: authEmail, password: authPassword };

    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      // Persist in LocalStorage
      localStorage.setItem('sync_token', data.token);
      localStorage.setItem('sync_user', JSON.stringify(data.user));
      setUser(data.user);
      setShowAuthModal(false);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sync_token');
    localStorage.removeItem('sync_user');
    setUser(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: '#fff' }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        borderBottom: '1px solid #1e293b',
        background: '#0b0f19'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>SyncSpace</h1>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Real-Time Collaborative Workspace & Architecture IDE</span>
        </div>
        
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <span style={{ background: '#059669', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
            ● Live Sync (CRDT Active)
          </span>
          <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
            Room: <b>demo-room</b> ({peerCount} {peerCount === 1 ? 'peer' : 'peers'})
          </span>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#3b82f6', color: '#fff', fontSize: '12px', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                👤 {user.name} (JWT Verified)
              </span>
              <button onClick={handleLogout} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                Logout
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
              🔑 Login / JWT Auth
            </button>
          )}
        </div>
      </header>

      {showAuthModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '8px', width: '320px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>{isRegister ? 'Register Account' : 'JWT User Login'}</h3>
            {authError && <p style={{ color: '#ef4444', fontSize: '12px', margin: '0 0 10px' }}>{authError}</p>}
            
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {isRegister && (
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  value={authName} 
                  onChange={(e) => setAuthName(e.target.value)} 
                  required 
                  style={{ padding: '8px', borderRadius: '4px', background: '#0f172a', border: '1px solid #475569', color: '#fff' }} 
                />
              )}
              <input 
                type="email" 
                placeholder="Email Address" 
                value={authEmail} 
                onChange={(e) => setAuthEmail(e.target.value)} 
                required 
                style={{ padding: '8px', borderRadius: '4px', background: '#0f172a', border: '1px solid #475569', color: '#fff' }} 
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={authPassword} 
                onChange={(e) => setAuthPassword(e.target.value)} 
                required 
                style={{ padding: '8px', borderRadius: '4px', background: '#0f172a', border: '1px solid #475569', color: '#fff' }} 
              />
              <button type="submit" style={{ padding: '8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px' }}>
                {isRegister ? 'Register & Generate JWT' : 'Login'}
              </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '11px' }}>
              <span onClick={() => { setIsRegister(!isRegister); setAuthError(''); }} style={{ color: '#38bdf8', cursor: 'pointer' }}>
                {isRegister ? 'Already have an account? Login' : "Don't have account? Register"}
              </span>
              <span onClick={() => setShowAuthModal(false)} style={{ color: '#94a3b8', cursor: 'pointer' }}>Close</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '0 16px', background: '#111827' }}>
        <SessionReplayBar totalSnapshots={50} onSeek={(frame) => setReplayFrame(frame)} />
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, borderRight: '2px solid #1e293b', position: 'relative' }}>
          <CanvasBoard replayFrame={replayFrame} currentUser={user?.name} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <CodeEditor />
        </div>
      </div>
    </div>
  );
}

export default App;