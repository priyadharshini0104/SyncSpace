import React, { useState, useEffect } from 'react';
import SignInPage from './components/SignInPage';
import SpaceSelectionPage from './components/SpaceSelectionPage';
import CanvasBoard from './components/CanvasBoard';
import CodeEditor from './components/CodeEditor';
import SessionReplayBar from './components/SessionReplayBar';
import { authService } from './utils/authService';
import socket from './socket';

function App() {
  const [replayFrame, setReplayFrame] = useState(0);
  const [peerCount, setPeerCount] = useState(1);
  const [user, setUser] = useState(() => authService.getUser());
  const [currentSpace, setCurrentSpace] = useState(null); // { id: string, name: string } | null
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Revalidate session on app mount
  useEffect(() => {
    authService.getMe().then((verifiedUser) => {
      setUser(verifiedUser || null);
    });
  }, []);

  // Room presence, deletion listener & auto-sync for current space
  useEffect(() => {
    if (!currentSpace) return;

    socket.emit('join-room', currentSpace.id);

    const onRoomUsers = (count) => {
      setPeerCount(count);
    };

    const onSpaceDeleted = (data) => {
      if (currentSpace && data.spaceId === currentSpace.id) {
        alert(`Notice: Space "${currentSpace.name || currentSpace.id}" was deleted.`);
        handleLeaveSpace();
      }
    };

    socket.on('room-users', onRoomUsers);
    socket.on('space-deleted', onSpaceDeleted);

    // Save to joinedSpaces in localStorage if user didn't create it
    if (user?.email) {
      try {
        const mySpacesKey = `syncspace_my_spaces_${user.email}`;
        const mySpaces = JSON.parse(localStorage.getItem(mySpacesKey) || '[]');
        const isMine = mySpaces.some(s => s.id.toLowerCase() === currentSpace.id.toLowerCase());
        if (!isMine) {
          const joinedKey = `syncspace_joined_spaces_${user.email}`;
          const joined = JSON.parse(localStorage.getItem(joinedKey) || '[]');
          const updated = [
            {
              id: currentSpace.id,
              name: currentSpace.name || currentSpace.id,
              joinedAt: new Date().toISOString()
            },
            ...joined.filter(s => s.id.toLowerCase() !== currentSpace.id.toLowerCase())
          ];
          localStorage.setItem(joinedKey, JSON.stringify(updated));
        }
      } catch {}
    }

    return () => {
      socket.off('room-users', onRoomUsers);
      socket.off('space-deleted', onSpaceDeleted);
    };
  }, [currentSpace, user]);

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    authService.clearSession();
    setUser(null);
    setCurrentSpace(null);
  };

  const handleSelectSpace = (space) => {
    setCurrentSpace(space);
  };

  const handleLeaveSpace = () => {
    if (currentSpace) {
      socket.emit('leave-room', currentSpace.id);
    }
    setCurrentSpace(null);
  };

  const handleCopySpaceCode = () => {
    if (currentSpace?.id) {
      navigator.clipboard.writeText(currentSpace.id);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    }
  };

  const handleDeleteCurrentSpace = async () => {
    if (!currentSpace || currentSpace.id === 'demo-room') {
      alert('The default demo-room space cannot be deleted.');
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to delete space "${currentSpace.name || currentSpace.id}"? All collaborators will be disconnected and this space will be deleted.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`http://localhost:5000/api/spaces/${encodeURIComponent(currentSpace.id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user?.email || '' })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete space.');
        return;
      }

      // Clean up localStorage
      if (user?.email) {
        const mySpacesKey = `syncspace_my_spaces_${user.email}`;
        const joinedKey = `syncspace_joined_spaces_${user.email}`;
        try {
          const mySpaces = JSON.parse(localStorage.getItem(mySpacesKey) || '[]');
          localStorage.setItem(mySpacesKey, JSON.stringify(mySpaces.filter(s => s.id !== currentSpace.id)));
          const joined = JSON.parse(localStorage.getItem(joinedKey) || '[]');
          localStorage.setItem(joinedKey, JSON.stringify(joined.filter(s => s.id !== currentSpace.id)));
        } catch {}
      }

      handleLeaveSpace();
    } catch (err) {
      alert('Could not connect to server to delete space.');
    }
  };


  // --- VIEW 1: SEPARATE SIGN-IN PAGE ---
  if (!user) {
    return <SignInPage onAuthSuccess={handleAuthSuccess} />;
  }

  // --- VIEW 2: JOIN OR CREATE A SPACE PAGE ---
  if (!currentSpace) {
    return (
      <SpaceSelectionPage
        user={user}
        onSelectSpace={handleSelectSpace}
        onLogout={handleLogout}
      />
    );
  }

  // --- VIEW 3: LIVE COLLABORATIVE SPACE WORKSPACE ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* SyncSpace Monochrome Top Chrome */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 24px',
        borderBottom: '1px solid #1e293b',
        background: '#0b0f19',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        zIndex: 10
      }}>
        {/* Left: Brand + Back to Spaces Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={handleLeaveSpace}
            className="button-secondary"
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              borderRadius: '9999px',
              background: '#1e293b',
              color: '#ffffff',
              border: '1px solid #334155',
              cursor: 'pointer'
            }}
            title="Leave this space and choose or create another"
          >
            &larr; All Spaces
          </button>

          <div style={{ height: '20px', width: '1px', backgroundColor: '#334155' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '9999px',
              background: '#000000',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '12px'
            }}>
              S
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{currentSpace.name}</span>
                <span 
                  onClick={handleCopySpaceCode}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px',
                    backgroundColor: '#1e293b',
                    color: '#94a3b8',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    border: '1px solid #334155'
                  }}
                  title="Click to copy space ID"
                >
                  #{currentSpace.id} {copiedNotification ? '✓ Copied' : '📋'}
                </span>
                {currentSpace.id !== 'demo-room' && (
                  <button
                    onClick={handleDeleteCurrentSpace}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      padding: '2px 10px',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginLeft: '6px'
                    }}
                    title="Permanently delete this space"
                  >
                    🗑 Delete Space
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right: Peer Count & User Info */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{
            background: 'rgba(5, 150, 105, 0.2)',
            color: '#34d399',
            border: '1px solid rgba(5, 150, 105, 0.4)',
            padding: '3px 12px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            CRDT Active
          </span>

          <span style={{ fontSize: '12px', color: '#94a3b8', background: '#1e293b', padding: '3px 12px', borderRadius: '9999px' }}>
            {peerCount} {peerCount === 1 ? 'collaborator' : 'collaborators'}
          </span>

          {/* User Profile Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#1e293b',
            padding: '4px 10px 4px 6px',
            borderRadius: '9999px',
            border: '1px solid #334155'
          }}>
            <img
              src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
              alt=""
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`;
              }}
            />
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#f8fafc' }}>
              {user.name}
            </span>

            <span style={{
              background: user.provider === 'google' || user.provider === 'both' ? 'rgba(66, 133, 244, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              color: user.provider === 'google' || user.provider === 'both' ? '#60a5fa' : '#93c5fd',
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: '9999px',
              fontWeight: '700'
            }}>
              {user.provider === 'google' || user.provider === 'both' ? 'Google' : 'JWT'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '5px 12px',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Session Replay Scrubber */}
      <div style={{ padding: '0 16px', background: '#111827' }}>
        <SessionReplayBar totalSnapshots={50} onSeek={(frame) => setReplayFrame(frame)} />
      </div>

      {/* Dual Pane Collaborative Workspace */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: Whiteboard Canvas */}
        <div style={{ flex: 1, borderRight: '2px solid #1e293b', position: 'relative' }}>
          <CanvasBoard
            roomId={currentSpace.id}
            currentUser={user}
            replayFrame={replayFrame}
          />
        </div>

        {/* Right: Monaco / Real-Time Code Buffer */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <CodeEditor roomId={currentSpace.id} />
        </div>
      </div>
    </div>
  );
}

export default App;