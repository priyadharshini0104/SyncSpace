import React, { useState, useEffect } from 'react';
import SignInPage from './components/SignInPage';
import SpaceSelectionPage from './components/SpaceSelectionPage';
import CanvasBoard from './components/CanvasBoard';
import CodeEditor from './components/CodeEditor';
import SessionReplayBar from './components/SessionReplayBar';
import CollaboratorsModal from './components/CollaboratorsModal';
import { authService } from './utils/authService';
import socket from './socket';

function App() {
  const [replayFrame, setReplayFrame] = useState(0);
  const [peerCount, setPeerCount] = useState(1);
  const [collaborators, setCollaborators] = useState([]);
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false);
  const [workspaceView, setWorkspaceView] = useState('split'); // 'split' | 'canvas' | 'code'
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

    socket.emit('join-room', {
      roomId: currentSpace.id,
      user: user
    });

    const onRoomUsers = (count) => {
      setPeerCount(count);
    };

    const onRoomCollaborators = (participants) => {
      if (Array.isArray(participants)) {
        setCollaborators(participants);
        setPeerCount(participants.length);
      }
    };

    socket.on('room-users', onRoomUsers);
    socket.on('room-collaborators', onRoomCollaborators);

    const onSpaceDeleted = (data) => {
      if (currentSpace && data.spaceId === currentSpace.id) {
        alert(`Notice: Space "${currentSpace.name || currentSpace.id}" was deleted.`);
        handleLeaveSpace();
      }
    };

    const onAllSpacesCleared = () => {
      if (currentSpace && currentSpace.id !== 'demo-room') {
        alert('Notice: All custom spaces were reset. Returning to Space Directory.');
        handleLeaveSpace();
      }
    };

    socket.on('room-users', onRoomUsers);
    socket.on('space-deleted', onSpaceDeleted);
    socket.on('all-spaces-cleared', onAllSpacesCleared);

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
      socket.off('room-collaborators', onRoomCollaborators);
      socket.off('space-deleted', onSpaceDeleted);
      socket.off('all-spaces-cleared', onAllSpacesCleared);
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

  // Fallback list of collaborators if socket awareness hasn't populated yet
  const activeCollaboratorsList = collaborators.length > 0 ? collaborators : [
    {
      id: socket.id || 'self',
      name: user?.name || 'You',
      email: user?.email || '',
      avatar: user?.avatar || '',
      color: '#000000',
      joinedAt: new Date().toISOString()
    }
  ];

  const collaboratorCount = collaborators.length > 0 ? collaborators.length : peerCount;

  // --- VIEW 3: LIVE COLLABORATIVE SPACE WORKSPACE (DESIGN.md COMPLIANT) ---
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#ffffff',
      color: '#000000',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* SyncSpace DESIGN.md Monochrome Top Chrome */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 24px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#ffffff',
        zIndex: 10,
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Left: Brand + Back to Spaces Pill + Space Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={handleLeaveSpace}
            className="button-secondary"
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              borderRadius: '9999px',
              cursor: 'pointer'
            }}
            title="Leave this space and choose or create another"
          >
            &larr; All Spaces
          </button>

          <div style={{ height: '20px', width: '1px', backgroundColor: '#e5e7eb' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '9999px',
              backgroundColor: '#000000',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '13px'
            }}>
              S
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#000000', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{currentSpace.name}</span>
                <span 
                  onClick={handleCopySpaceCode}
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '11px',
                    backgroundColor: '#f3f4f6',
                    color: '#4b5563',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    border: '1px solid #e5e7eb'
                  }}
                  title="Click to copy space ID"
                >
                  #{currentSpace.id} {copiedNotification ? '✓ Copied' : '📋'}
                </span>
                {currentSpace.id !== 'demo-room' && (
                  <button
                    onClick={handleDeleteCurrentSpace}
                    className="button-danger"
                    style={{
                      padding: '2px 10px',
                      fontSize: '11px'
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

        {/* Center: Workspace View Switcher (DESIGN.md Pill Segmented Control) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#f3f4f6',
          padding: '3px',
          borderRadius: '9999px',
          border: '1px solid #e5e7eb',
          gap: '2px'
        }}>
          {[
            { id: 'canvas', label: '🎨 Whiteboard' },
            { id: 'split', label: '⚡ Split View' },
            { id: 'code', label: '💻 Code Editor' }
          ].map((mode) => {
            const isActive = workspaceView === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setWorkspaceView(mode.id)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '9999px',
                  border: 'none',
                  backgroundColor: isActive ? '#000000' : 'transparent',
                  color: isActive ? '#ffffff' : '#4b5563',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease'
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
        
        {/* Right: Interactive Collaborators Pill, Profile, & Sign Out */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* CRDT Mint Badge */}
          <span style={{
            backgroundColor: 'var(--color-block-mint, #c7f5db)',
            color: '#065f46',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
            CRDT Active
          </span>

          {/* INTERACTIVE COLLABORATORS BUTTON */}
          <button
            type="button"
            onClick={() => setShowCollaboratorsModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              padding: '4px 12px 4px 8px',
              borderRadius: '9999px',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, border-color 0.15s ease'
            }}
            title="Click to view all collaborators in this space"
          >
            {/* Overlapping Avatar Stack */}
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '2px' }}>
              {activeCollaboratorsList.slice(0, 3).map((c, i) => (
                <img
                  key={c.id || c.socketId || i}
                  src={c.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name || 'User')}`}
                  alt=""
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    marginLeft: i > 0 ? '-6px' : '0',
                    border: '1.5px solid #ffffff',
                    backgroundColor: '#ffffff'
                  }}
                  onError={(e) => {
                    e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=User`;
                  }}
                />
              ))}
            </div>

            <span style={{ fontSize: '12px', fontWeight: '600', color: '#111827' }}>
              {collaboratorCount} {collaboratorCount === 1 ? 'Collaborator' : 'Collaborators'}
            </span>

            <span style={{
              fontSize: '10px',
              backgroundColor: '#000000',
              color: '#ffffff',
              padding: '1px 6px',
              borderRadius: '9999px',
              fontWeight: '700'
            }}>
              View ▾
            </span>
          </button>

          {/* User Profile Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ffffff',
            padding: '4px 10px 4px 6px',
            borderRadius: '9999px',
            border: '1px solid #e5e7eb'
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
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#111827' }}>
              {user.name}
            </span>

            <span style={{
              backgroundColor: user.provider === 'google' || user.provider === 'both' ? '#e0f2fe' : '#f3f4f6',
              color: user.provider === 'google' || user.provider === 'both' ? '#0369a1' : '#4b5563',
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
            className="button-secondary"
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              borderRadius: '9999px'
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Session Replay Scrubber Container (Monochrome) */}
      <div style={{ padding: '4px 20px', backgroundColor: '#fcfcfc', borderBottom: '1px solid #e5e7eb' }}>
        <SessionReplayBar totalSnapshots={50} onSeek={(frame) => setReplayFrame(frame)} />
      </div>

      {/* Dual Pane / Responsive Collaborative Workspace */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', backgroundColor: '#ffffff' }}>
        {/* Whiteboard Canvas Pane */}
        {(workspaceView === 'split' || workspaceView === 'canvas') && (
          <div style={{
            flex: workspaceView === 'canvas' ? 1 : (workspaceView === 'split' ? 1 : 0),
            borderRight: workspaceView === 'split' ? '1px solid #e5e7eb' : 'none',
            position: 'relative',
            height: '100%'
          }}>
            <CanvasBoard
              roomId={currentSpace.id}
              currentUser={user}
              replayFrame={replayFrame}
            />
          </div>
        )}

        {/* Monaco / Real-Time Code Buffer Pane */}
        {(workspaceView === 'split' || workspaceView === 'code') && (
          <div style={{
            flex: workspaceView === 'code' ? 1 : (workspaceView === 'split' ? 1 : 0),
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
            <CodeEditor roomId={currentSpace.id} />
          </div>
        )}
      </div>

      {/* Collaborators Modal Popover */}
      <CollaboratorsModal
        isOpen={showCollaboratorsModal}
        onClose={() => setShowCollaboratorsModal(false)}
        collaborators={activeCollaboratorsList}
        currentUser={user}
        roomId={currentSpace.id}
        roomName={currentSpace.name}
      />
    </div>
  );
}

export default App;