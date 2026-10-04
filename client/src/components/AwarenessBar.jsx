import React from 'react';

export default function AwarenessBar({ users = [] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#1e1e2e', borderBottom: '1px solid #313244', color: '#cdd6f4', fontSize: '13px' }}>
      <span style={{ fontWeight: 'bold' }}>Active Users:</span>
      {users.length === 0 && <span style={{ opacity: 0.6 }}>Only you</span>}
      {users.map((user, idx) => (
        <span key={idx} style={{ backgroundColor: user.color || '#89b4fa', color: '#11111b', padding: '2px 8px', borderRadius: '12px', fontWeight: '600', fontSize: '12px' }}>
          {user.name || ('User-' + (idx + 1))}
        </span>
      ))}
    </div>
  );
}
