import React from 'react';

export default function CursorOverlay({ cursors = {} }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {Object.entries(cursors).map(([id, cursor]) => {
        if (!cursor || cursor.x === undefined || cursor.y === undefined) return null;
        return (
          <div key={id} style={{ position: 'absolute', left: cursor.x + 'px', top: cursor.y + 'px', transform: 'translate(-2px, -2px)', transition: 'left 0.05s linear, top 0.05s linear' }}>
            <svg width='18' height='18' viewBox='0 0 24 24' fill={cursor.color || '#f38ba8'}><path d='M3 3l7 18 3-7 7-3L3 3z' /></svg>
            <span style={{ marginLeft: '14px', backgroundColor: cursor.color || '#f38ba8', color: '#11111b', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{cursor.name || 'Anonymous'}</span>
          </div>
        );
      })}
    </div>
  );
}