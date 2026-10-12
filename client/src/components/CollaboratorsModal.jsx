import React, { useState } from 'react';

export default function CollaboratorsModal({
  isOpen,
  onClose,
  collaborators = [],
  currentUser,
  roomId = 'demo-room',
  roomName = 'Demo Room'
}) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const count = collaborators.length || 1;

  const handleCopyId = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyLink = () => {
    const url = window.location.origin + '?space=' + encodeURIComponent(roomId);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease-out forwards'
      }}
    >
      {/* Modal Surface - Clean Monochrome Frame with Pastel Cards */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.25), 0 0 1px 1px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f3f4f6'
        }}>
          <div>
            <div className="caption" style={{ color: '#6b7280', marginBottom: '4px' }}>
              COLLABORATIVE WORKSPACE &middot; SPACE #{roomId}
            </div>
            <h2 className="headline" style={{ margin: 0, fontSize: '22px' }}>
              Active Collaborators
            </h2>
          </div>

          <button
            onClick={onClose}
            className="button-secondary"
            style={{
              width: '36px',
              height: '36px',
              padding: 0,
              borderRadius: '50%',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Close"
          >
            &times;
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {/* Pastel Mint Color-Block Highlight Banner: Number of Collaborators */}
          <div style={{
            backgroundColor: 'var(--color-block-mint, #c7f5db)',
            borderRadius: '18px',
            padding: '20px 24px',
            marginBottom: '24px',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: '600',
                color: '#065f46',
                fontFamily: 'var(--font-mono, monospace)',
                marginBottom: '8px'
              }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.3)'
                }} />
                REAL-TIME PRESENCE ACTIVE
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#064e3b', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                {count} {count === 1 ? 'Collaborator' : 'Collaborators'}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#047857' }}>
                Connected to space <b>{roomName || roomId}</b> with instant cursor and canvas synchronization.
              </p>
            </div>

            <div style={{
              fontSize: '38px',
              lineHeight: 1,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))'
            }}>
              👥
            </div>
          </div>

          {/* Collaborator List Section */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="caption" style={{ color: '#4b5563', fontWeight: '600' }}>
                CONNECTED PARTICIPANTS ({collaborators.length})
              </span>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                Live Socket Sync
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {collaborators.map((c, index) => {
                const isCurrent = currentUser && (
                  (c.email && currentUser.email && c.email.toLowerCase() === currentUser.email.toLowerCase()) ||
                  (c.name && currentUser.name && c.name.toLowerCase() === currentUser.name.toLowerCase()) ||
                  index === 0
                );

                const displayName = c.name || (isCurrent ? (currentUser?.name || 'You') : `Collaborator #${index + 1}`);
                const avatarUrl = c.avatar || (isCurrent && currentUser?.avatar) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;
                const cursorColor = c.color || '#3b82f6';

                return (
                  <div
                    key={c.id || c.socketId || index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '14px',
                      border: '1px solid #e5e7eb',
                      transition: 'background-color 0.1s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ position: 'relative' }}>
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: `2px solid ${cursorColor}`,
                            backgroundColor: '#ffffff'
                          }}
                          onError={(e) => {
                            e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;
                          }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '0',
                            right: '0',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: '#10b981',
                            border: '2px solid #ffffff'
                          }}
                          title="Online"
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                            {displayName}
                          </span>
                          {isCurrent && (
                            <span style={{
                              backgroundColor: '#000000',
                              color: '#ffffff',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '10px',
                              fontWeight: '600',
                              letterSpacing: '0.04em'
                            }}>
                              YOU
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          {c.email && (
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                              {c.email}
                            </span>
                          )}
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: '#9ca3af'
                          }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cursorColor, display: 'inline-block' }} />
                            Live Cursor
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        backgroundColor: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        color: '#065f46',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                        Active
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Share & Invite Section - Soft Pastel Block */}
          <div style={{
            backgroundColor: 'var(--color-block-cream, #fff5ea)',
            borderRadius: '18px',
            padding: '20px 24px',
            border: '1px solid #fed7aa'
          }}>
            <div className="caption" style={{ color: '#9a3412', marginBottom: '6px' }}>
              INVITE TEAMMATES TO THIS SPACE
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#7c2d12' }}>
              Share this Space ID with colleagues so they can jump into this canvas and code room instantly.
            </p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleCopyId}
                className="button-primary"
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                {copiedId ? '✓ Copied Space ID!' : `Copy Space ID (#${roomId})`}
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="button-secondary"
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                {copiedLink ? '✓ Copied Link!' : 'Copy Direct Link'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: '#fafafa'
        }}>
          <button
            type="button"
            onClick={onClose}
            className="button-secondary"
            style={{ padding: '8px 24px', fontSize: '13px' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
