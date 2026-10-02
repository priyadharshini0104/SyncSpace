import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const initialCode = `// Happy Collaborating in SyncSpace!
function syncArchitecture() {
  console.log("WebSocket and CRDT synced successfully.");
  return true;
}

syncArchitecture();`;

const CodeEditor = () => {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState('javascript');
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    socket.emit('join-room', 'demo-room');

    socket.on('code-change', (newCode) => {
      setCode(newCode);
    });

    return () => {
      socket.off('code-change');
    };
  }, []);

  const handleCodeChange = (e) => {
    const updatedCode = e.target.value;
    setCode(updatedCode);
    socket.emit('code-change', {
      room: 'demo-room',
      code: updatedCode
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: theme === 'dark' ? '#1e1e1e' : '#ffffff' }}>
      {/* Top Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: '#111827',
        borderBottom: '1px solid #374151'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 'bold' }}>Language:</span>
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            style={{ background: '#1f2937', color: '#fff', border: '1px solid #4b5563', padding: '4px 8px', borderRadius: '4px' }}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
          </select>

          <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 'bold', marginLeft: '8px' }}>Theme:</span>
          <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value)}
            style={{ background: '#1f2937', color: '#fff', border: '1px solid #4b5563', padding: '4px 8px', borderRadius: '4px' }}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
        <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>● Live Peer Sync</span>
      </div>

      {/* Code Text Area Editor */}
      <textarea
        value={code}
        onChange={handleCodeChange}
        spellCheck="false"
        style={{
          flex: 1,
          width: '100%',
          padding: '16px',
          background: theme === 'dark' ? '#1e1e2e' : '#ffffff',
          color: theme === 'dark' ? '#50fa7b' : '#111827',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '14px',
          lineHeight: '1.6',
          border: 'none',
          outline: 'none',
          resize: 'none'
        }}
      />
    </div>
  );
};

export default CodeEditor;