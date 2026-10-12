import React, { useState, useEffect } from 'react';

export default function SpaceSelectionPage({ user, onSelectSpace, onLogout }) {
  const [createName, setCreateName] = useState('Architecture Sprint');
  const [createId, setCreateId] = useState(() => 'space-' + Math.floor(1000 + Math.random() * 9000));
  const [joinId, setJoinId] = useState('');
  
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [createError, setCreateError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const storageKey = 'syncspace_my_spaces_' + (user?.email || 'guest');
  const joinedStorageKey = 'syncspace_joined_spaces_' + (user?.email || 'guest');

  // Load created spaces from local storage and sync with server
  const [mySpaces, setMySpaces] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load joined spaces from local storage (defaults to demo-room if empty)
  const [joinedSpaces, setJoinedSpaces] = useState(() => {
    try {
      const saved = localStorage.getItem(joinedStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [{ id: 'demo-room', name: 'Demo Room', joinedAt: new Date().toISOString() }];
  });

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'created' | 'joined'
  const [deletingId, setDeletingId] = useState(null);

  // Sync joined spaces to localStorage
  const saveJoinedSpace = (space) => {
    if (!space || !space.id) return;
    const cleanId = space.id.trim().toLowerCase();
    // Don't duplicate in joined if user created it
    if (mySpaces.some(s => s.id.toLowerCase() === cleanId)) return;

    setJoinedSpaces((prev) => {
      const filtered = prev.filter(s => s.id.toLowerCase() !== cleanId);
      const updated = [
        {
          id: cleanId,
          name: (space.name && space.name.trim()) || cleanId,
          joinedAt: new Date().toISOString()
        },
        ...filtered
      ];
      try {
        localStorage.setItem(joinedStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleRemoveJoinedSpace = (spaceId) => {
    setJoinedSpaces((prev) => {
      const updated = prev.filter(s => s.id.toLowerCase() !== spaceId.toLowerCase());
      try {
        localStorage.setItem(joinedStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleEnterJoinedSpace = async (space) => {
    setJoinError('');
    setLoadingJoin(true);
    try {
      const res = await fetch(`http://localhost:5000/api/spaces/verify/${encodeURIComponent(space.id)}`);
      const data = await res.json();
      if (!res.ok || !data.exists) {
        setJoinError(`Space "${space.id}" has been deleted or is no longer available.`);
        handleRemoveJoinedSpace(space.id);
        return;
      }
      saveJoinedSpace(data.space);
      onSelectSpace({ id: data.space.id, name: data.space.name });
    } catch {
      onSelectSpace({ id: space.id, name: space.name });
    } finally {
      setLoadingJoin(false);
    }
  };

  const handleDeleteCreatedSpace = async (spaceId, spaceName) => {
    if (spaceId === 'demo-room') {
      alert('The default demo-room space cannot be deleted.');
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to delete space "${spaceName || spaceId}"? This will permanently delete the space and clear drawing history.`);
    if (!confirmed) return;

    setDeletingId(spaceId);
    try {
      const res = await fetch(`http://localhost:5000/api/spaces/${encodeURIComponent(spaceId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user?.email || '' })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete space.');
        return;
      }

      // Remove from mySpaces
      setMySpaces((prev) => {
        const updated = prev.filter(s => s.id !== spaceId);
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // Also remove from joinedSpaces if it was tracked there
      setJoinedSpaces((prev) => {
        const updated = prev.filter(s => s.id !== spaceId);
        try {
          localStorage.setItem(joinedStorageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } catch (err) {
      alert('Could not connect to server to delete space.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (user?.email) {
      fetch(`http://localhost:5000/api/spaces/user/${encodeURIComponent(user.email)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.spaces && Array.isArray(data.spaces)) {
            setMySpaces((prev) => {
              const combined = [...data.spaces];
              // merge any local ones not on server
              prev.forEach(p => {
                if (!combined.some(c => c.id === p.id)) {
                  combined.push(p);
                }
              });
              localStorage.setItem(storageKey, JSON.stringify(combined));
              return combined;
            });
          }
        })
        .catch(() => {});
    }
  }, [user?.email, storageKey]);

  const handleGenerateId = () => {
    setCreateId('space-' + Math.floor(1000 + Math.random() * 9000));
  };

  const handleCopy = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSubmit = async (e, overrideId = null, overrideName = null) => {
    if (e && e.preventDefault) e.preventDefault();
    setCreateError('');
    setJoinError('');
    const targetId = overrideId || createId;
    const targetName = overrideName || createName;
    const cleanId = targetId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (!cleanId) return;

    setLoadingCreate(true);
    try {
      const res = await fetch('http://localhost:5000/api/spaces/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cleanId,
          name: targetName.trim() || cleanId,
          createdBy: user?.email || 'anonymous'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create space.');
        return;
      }

      // Add to mySpaces
      const updated = [data.space, ...mySpaces.filter(s => s.id !== data.space.id)];
      setMySpaces(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));

      onSelectSpace(data.space);
    } catch (err) {
      setCreateError('Could not connect to server to create space.');
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setJoinError('');
    setCreateError('');
    const trimmed = joinId.trim().toLowerCase();
    if (!trimmed) {
      setJoinError('Please enter a Space ID.');
      return;
    }

    setLoadingJoin(true);
    try {
      const res = await fetch(`http://localhost:5000/api/spaces/verify/${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok || !data.exists) {
        setJoinError(`Space "${trimmed}" has not been created yet.`);
        return;
      }
      const targetSpace = {
        id: data.space.id,
        name: data.space.name
      };
      saveJoinedSpace(targetSpace);
      onSelectSpace(targetSpace);
    } catch (err) {
      setJoinError('Could not verify space. Server connection failed.');
    } finally {
      setLoadingJoin(false);
    }
  };


  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', color: '#000000' }}>
      {/* Monochrome Top Nav */}
      <header style={{
        height: '60px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        backgroundColor: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
            fontSize: '14px'
          }}>
            S
          </div>
          <span style={{ fontWeight: '600', fontSize: '18px', letterSpacing: '-0.4px' }}>SyncSpace</span>
          <span className="caption" style={{ color: '#6b7280', marginLeft: '8px' }}>
            WORKSPACE DIRECTORY
          </span>
        </div>

        {/* User Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 14px',
              borderRadius: '9999px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb'
            }}>
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || 'User')}`}
                alt=""
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>
                {user.name}
              </span>
              <span className="caption" style={{
                backgroundColor: user.provider === 'google' || user.provider === 'both' ? '#e0f2fe' : '#e5e7eb',
                color: user.provider === 'google' || user.provider === 'both' ? '#0369a1' : '#374151',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '10px'
              }}>
                {user.provider === 'google' || user.provider === 'both' ? 'Google' : 'JWT'}
              </span>
            </div>
          )}

          <button
            onClick={onLogout}
            className="button-secondary"
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Page Area */}
      <main style={{ flex: 1, maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '48px 32px' }}>
        {/* Editorial Opener */}
        <div style={{ marginBottom: '40px' }}>
          <div className="eyebrow" style={{ color: '#4b5563', marginBottom: '12px' }}>
            COLLABORATIVE SPACES
          </div>
          <h1 className="display-xl" style={{ marginBottom: '16px' }}>
            Spaces are where the work happens.
          </h1>
          <p className="subhead" style={{ maxWidth: '640px', color: '#374151' }}>
            Create a custom room or join an existing space using its Space ID. Share your room ID with teammates to collaborate simultaneously on canvas diagrams and code.
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={activeTab === 'all' ? 'button-primary' : 'button-secondary'}
            style={{ padding: '6px 18px', fontSize: '13px' }}
          >
            All Spaces ({mySpaces.length + joinedSpaces.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('created')}
            className={activeTab === 'created' ? 'button-primary' : 'button-secondary'}
            style={{ padding: '6px 18px', fontSize: '13px' }}
          >
            Created by You ({mySpaces.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('joined')}
            className={activeTab === 'joined' ? 'button-primary' : 'button-secondary'}
            style={{ padding: '6px 18px', fontSize: '13px' }}
          >
            Joined Spaces ({joinedSpaces.length})
          </button>
        </div>

        {/* --- SECTION: YOUR CREATED SPACES --- */}
        {(activeTab === 'all' || activeTab === 'created') && (
          <div style={{
            marginBottom: '36px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '24px',
            padding: '32px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div className="eyebrow" style={{ color: '#374151', marginBottom: '4px' }}>
                  YOUR CREATED SPACES &middot; SHAREABLE ROOMS
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                  Spaces you created. Share your Space ID with teammates so they can join you in real-time.
                </p>
              </div>
              <span className="caption" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', padding: '4px 12px', borderRadius: '9999px' }}>
                {mySpaces.length} {mySpaces.length === 1 ? 'Space' : 'Spaces'} Created
              </span>
            </div>

            {mySpaces.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '16px',
                marginTop: '16px'
              }}>
                {mySpaces.map((space) => (
                  <div
                    key={space.id}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '16px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>
                        {space.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '12px',
                          backgroundColor: '#f3f4f6',
                          color: '#1f2937',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                          fontWeight: '600'
                        }}>
                          #{space.id}
                        </span>
                        <span className="caption" style={{ color: '#9ca3af' }}>
                          {space.createdAt ? new Date(space.createdAt).toLocaleDateString() : 'Active Space'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleCopy(space.id)}
                        className="button-secondary"
                        style={{
                          flex: '1 1 auto',
                          padding: '8px 12px',
                          fontSize: '12px',
                          borderRadius: '9999px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                        title="Copy Space ID to share with teammates"
                      >
                        <span>{copiedId === space.id ? '✓ Copied ID!' : '📋 Copy Space ID'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectSpace({ id: space.id, name: space.name })}
                        className="button-primary"
                        style={{
                          padding: '8px 16px',
                          fontSize: '12px',
                          borderRadius: '9999px'
                        }}
                      >
                        Enter Space &rarr;
                      </button>

                      <button
                        type="button"
                        disabled={deletingId === space.id}
                        onClick={() => handleDeleteCreatedSpace(space.id, space.name)}
                        className="button-danger"
                        style={{
                          padding: '8px 12px',
                          fontSize: '12px',
                          borderRadius: '9999px',
                          opacity: deletingId === space.id ? 0.6 : 1
                        }}
                        title="Permanently delete this space"
                      >
                        {deletingId === space.id ? 'Deleting...' : '🗑 Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px dashed #d1d5db',
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px',
                marginTop: '12px'
              }}>
                ✨ No spaces created yet. Use <b>"Start a New Space"</b> below to create your first space and share its ID.
              </div>
            )}
          </div>
        )}

        {/* --- SECTION: YOUR JOINED SPACES --- */}
        {(activeTab === 'all' || activeTab === 'joined') && (
          <div style={{
            marginBottom: '48px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '24px',
            padding: '32px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div className="eyebrow" style={{ color: '#374151', marginBottom: '4px' }}>
                  YOUR JOINED SPACES &middot; COLLABORATIVE ROOMS
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                  Rooms you have joined. Re-enter anytime or copy room IDs to share with teammates.
                </p>
              </div>
              <span className="caption" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', padding: '4px 12px', borderRadius: '9999px' }}>
                {joinedSpaces.length} {joinedSpaces.length === 1 ? 'Space' : 'Spaces'} Joined
              </span>
            </div>

            {joinedSpaces.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '16px',
                marginTop: '16px'
              }}>
                {joinedSpaces.map((space) => (
                  <div
                    key={space.id}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '16px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>
                        {space.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '12px',
                          backgroundColor: '#f3f4f6',
                          color: '#1f2937',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                          fontWeight: '600'
                        }}>
                          #{space.id}
                        </span>
                        <span className="caption" style={{
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '10px'
                        }}>
                          Joined Member
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleCopy(space.id)}
                        className="button-secondary"
                        style={{
                          flex: '1 1 auto',
                          padding: '8px 12px',
                          fontSize: '12px',
                          borderRadius: '9999px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                        title="Copy Space ID to share with teammates"
                      >
                        <span>{copiedId === space.id ? '✓ Copied ID!' : '📋 Copy Space ID'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEnterJoinedSpace(space)}
                        className="button-primary"
                        style={{
                          padding: '8px 16px',
                          fontSize: '12px',
                          borderRadius: '9999px'
                        }}
                      >
                        Enter Space &rarr;
                      </button>

                      {space.id !== 'demo-room' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveJoinedSpace(space.id)}
                          className="button-secondary"
                          style={{
                            padding: '8px 12px',
                            fontSize: '12px',
                            borderRadius: '9999px',
                            color: '#6b7280'
                          }}
                          title="Remove from your joined spaces list"
                        >
                          ✕ Leave
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px dashed #d1d5db',
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px',
                marginTop: '12px'
              }}>
                🔗 No joined spaces yet. Enter a Space ID below to join an active collaborative room.
              </div>
            )}
          </div>
        )}

        {/* Two Oversized Pastel Color-Blocks */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '32px',
          marginBottom: '48px'
        }}>
          
          {/* 1. Create a Space (Block Mint) */}
          <div className="color-block color-block-mint" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="eyebrow" style={{ color: '#065f46', marginBottom: '12px' }}>
                01 &middot; CREATE A SPACE
              </div>
              <h2 className="headline" style={{ fontSize: '32px', marginBottom: '12px', color: '#064e3b' }}>
                Start a New Space
              </h2>
              <p style={{ fontSize: '16px', color: '#065f46', lineHeight: 1.45, marginBottom: '20px' }}>
                Register a new collaborative room. Share the generated Space ID with your teammates so they can join you.
              </p>

              {createError && (
                <div style={{
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginBottom: '16px'
                }}>
                  ⚠️ {createError}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="caption" style={{ display: 'block', marginBottom: '6px', color: '#064e3b', fontWeight: 'bold' }}>
                    SPACE NAME
                  </label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Distributed System Review"
                    className="sync-input"
                    required
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="caption" style={{ color: '#064e3b', fontWeight: 'bold' }}>
                      ASSIGN UNIQUE SPACE ID
                    </label>
                    <span
                      onClick={handleGenerateId}
                      style={{ fontSize: '11px', color: '#047857', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      🎲 Generate Random
                    </span>
                  </div>
                  <input
                    type="text"
                    value={createId}
                    onChange={(e) => setCreateId(e.target.value)}
                    placeholder="e.g. arch-room-101"
                    className="sync-input"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingCreate}
                  className="button-primary"
                  style={{
                    marginTop: '8px',
                    padding: '14px 28px',
                    width: '100%',
                    fontSize: '15px'
                  }}
                >
                  {loadingCreate ? 'Creating Space...' : 'Create & Enter Space →'}
                </button>
              </form>
            </div>
          </div>

          {/* 2. Join an Existing Space (Block Lilac) */}
          <div className="color-block color-block-lilac" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="eyebrow" style={{ color: '#4c1d95', marginBottom: '12px' }}>
                02 &middot; JOIN A SPACE
              </div>
              <h2 className="headline" style={{ fontSize: '32px', marginBottom: '12px', color: '#3b0764' }}>
                Join an Existing Space
              </h2>
              <p style={{ fontSize: '16px', color: '#4c1d95', lineHeight: 1.45, marginBottom: '20px' }}>
                Enter the exact Space ID provided by your team member to join their active whiteboard and code buffer.
              </p>

              {joinError && (
                <div style={{
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                    <span>⚠️</span>
                    <span>{joinError}</span>
                  </div>
                  {joinId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleCreateSubmit(null, joinId, joinId)}
                        className="button-primary"
                        style={{
                          padding: '7px 16px',
                          fontSize: '12px',
                          background: '#000000',
                          color: '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        ⚡ Create &amp; Enter "{joinId}" now &rarr;
                      </button>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="caption" style={{ display: 'block', marginBottom: '6px', color: '#3b0764', fontWeight: 'bold' }}>
                    ENTER SPACE ID / ROOM CODE
                  </label>
                  <input
                    type="text"
                    value={joinId}
                    onChange={(e) => { setJoinId(e.target.value); setJoinError(''); }}
                    placeholder="Enter valid Space ID (e.g. demo-room)"
                    className="sync-input"
                    required
                  />
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b21a8' }}>
                    Tip: Use <b>demo-room</b> to join the default shared space.
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loadingJoin}
                  className="button-primary"
                  style={{
                    marginTop: '8px',
                    padding: '14px 28px',
                    width: '100%',
                    fontSize: '15px'
                  }}
                >
                  {loadingJoin ? 'Verifying Space...' : 'Join Space →'}
                </button>
              </form>
            </div>
          </div>

        </div>

        {/* Bottom Feature Block: Cream Story Block */}
        <div className="color-block color-block-cream" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          alignItems: 'center'
        }}>
          <div>
            <div className="eyebrow" style={{ color: '#78350f', marginBottom: '8px' }}>
              REAL-TIME ARCHITECTURE
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 8px', color: '#451a03' }}>
              Dual-Pane Canvas &amp; Code IDE
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#78350f', lineHeight: 1.5 }}>
              Inside each space, collaborators draw synchronously on an interactive canvas and edit code in Monaco with Yjs CRDT merge guarantees.
            </p>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid #fde68a'
          }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>
              🎨 Interactive 2D Canvas Board
            </div>
            <div style={{ fontSize: '12px', color: '#4b5563' }}>
              Pen, rectangles, circles, diamonds, text, eraser, and multi-user cursor awareness with avatars.
            </div>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid #fde68a'
          }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>
              ⚡ Yjs CRDT &amp; Code Editor
            </div>
            <div style={{ fontSize: '12px', color: '#4b5563' }}>
              Multi-language code buffer with real-time replication and zero merge conflicts.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        height: '48px',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        backgroundColor: '#ffffff'
      }}>
        <span className="caption" style={{ color: '#9ca3af' }}>
          SyncSpace &middot; Dynamic Room Engine
        </span>
        <span className="caption" style={{ color: '#9ca3af' }}>
          SyncSpace Workspace &middot; Real-Time System
        </span>
      </footer>
    </div>
  );
}
