import React, { useState } from 'react';
import CanvasBoard from './components/CanvasBoard';
import CodeEditor from './components/CodeEditor';
import SessionReplayBar from './components/SessionReplayBar';

function App() {
  const [replayFrame, setReplayFrame] = useState(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: '#fff' }}>
      {/* Top Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        borderBottom: '1px solid #1e293b',
        background: '#0b0f19'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>SyncSpace</h1>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Real-Time Collaborative Workspace & Architecture IDE</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ background: '#059669', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>
            ● Live Sync (CRDT Active)
          </span>
          <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Room: <b>demo-room</b> (3 peers)</span>
        </div>
      </header>

      {/* Week 4 Session Replay Bar Integration */}
      <div style={{ padding: '0 16px', background: '#111827' }}>
        <SessionReplayBar 
          totalSnapshots={50} 
          onSeek={(frame) => setReplayFrame(frame)} 
        />
      </div>

      {/* Split Workspace */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: Whiteboard Canvas */}
        <div style={{ flex: 1, borderRight: '2px solid #1e293b', position: 'relative' }}>
          <CanvasBoard replayFrame={replayFrame} />
        </div>

        {/* Right: Monaco Code Editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 16px', background: '#1e293b', fontSize: '13px', fontWeight: '600' }}>
            Monaco Editor (Yjs Bound)
          </div>
          <div style={{ flex: 1 }}>
            <CodeEditor />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;