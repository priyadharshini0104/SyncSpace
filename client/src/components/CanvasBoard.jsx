import React, { useState } from 'react';

const CanvasBoard = ({ replayFrame }) => {
  const [tool, setTool] = useState('pen');
  const [strokeColor, setStrokeColor] = useState('#2563eb');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff' }}>
      {/* Advanced Diagram Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        color: '#0f172a'
      }}>
        <span style={{ fontWeight: 'bold', fontSize: '13px', marginRight: '6px' }}>Tools:</span>
        <button onClick={() => setTool('pen')} style={{ padding: '4px 8px', borderRadius: '4px', background: tool === 'pen' ? '#2563eb' : '#e2e8f0', color: tool === 'pen' ? '#fff' : '#000', border: 'none', cursor: 'pointer' }}>✏️ Pen</button>
        <button onClick={() => setTool('rect')} style={{ padding: '4px 8px', borderRadius: '4px', background: tool === 'rect' ? '#2563eb' : '#e2e8f0', color: tool === 'rect' ? '#fff' : '#000', border: 'none', cursor: 'pointer' }}>▭ Rectangle</button>
        <button onClick={() => setTool('circle')} style={{ padding: '4px 8px', borderRadius: '4px', background: tool === 'circle' ? '#2563eb' : '#e2e8f0', color: tool === 'circle' ? '#fff' : '#000', border: 'none', cursor: 'pointer' }}>⭕ Circle</button>
        <button onClick={() => setTool('arrow')} style={{ padding: '4px 8px', borderRadius: '4px', background: tool === 'arrow' ? '#2563eb' : '#e2e8f0', color: tool === 'arrow' ? '#fff' : '#000', border: 'none', cursor: 'pointer' }}>➔ Arrow</button>
        <button onClick={() => setTool('text')} style={{ padding: '4px 8px', borderRadius: '4px', background: tool === 'text' ? '#2563eb' : '#e2e8f0', color: tool === 'text' ? '#fff' : '#000', border: 'none', cursor: 'pointer' }}>🔤 Text</button>
        <button onClick={() => setTool('eraser')} style={{ padding: '4px 8px', borderRadius: '4px', background: tool === 'eraser' ? '#ef4444' : '#e2e8f0', color: tool === 'eraser' ? '#fff' : '#000', border: 'none', cursor: 'pointer' }}>🧹 Eraser</button>

        <span style={{ marginLeft: '12px', fontSize: '13px', fontWeight: 'bold' }}>Color:</span>
        <input 
          type="color" 
          value={strokeColor} 
          onChange={(e) => setStrokeColor(e.target.value)} 
          style={{ width: '28px', height: '28px', border: 'none', cursor: 'pointer', background: 'transparent' }}
        />
      </div>

      {/* Canvas Drawing Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg style={{ width: '100%', height: '100%' }}>
          {/* Sample architectural elements matching Axlero PDF diagram use case */}
          <rect x="60" y="80" width="160" height="70" rx="8" fill="none" stroke="#2563eb" strokeWidth="2.5" />
          <text x="85" y="120" fill="#1e293b" fontSize="14" fontFamily="sans-serif">React Client</text>

          <line x1="220" y1="115" x2="330" y2="115" stroke="#64748b" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrowhead)" />
          <text x="235" y="105" fill="#64748b" fontSize="11" fontFamily="sans-serif">WebSocket</text>

          <rect x="330" y="80" width="160" height="70" rx="8" fill="none" stroke="#059669" strokeWidth="2.5" />
          <text x="360" y="120" fill="#1e293b" fontSize="14" fontFamily="sans-serif">Socket Server</text>

          <line x1="490" y1="115" x2="600" y2="115" stroke="#64748b" strokeWidth="2" markerEnd="url(#arrowhead)" />
          <text x="520" y="105" fill="#64748b" fontSize="11" fontFamily="sans-serif">CRDT Yjs</text>

          <circle cx="650" cy="115" r="45" fill="none" stroke="#d97706" strokeWidth="2.5" />
          <text x="625" y="120" fill="#1e293b" fontSize="13" fontFamily="sans-serif">MongoDB</text>

          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
            </marker>
          </defs>
        </svg>

        {replayFrame > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: 'rgba(0,0,0,0.75)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px'
          }}>
            Replaying Frame #{replayFrame} (Historical View)
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvasBoard;