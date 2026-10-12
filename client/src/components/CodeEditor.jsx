import React, { useState, useEffect } from 'react';
import socket from '../socket';

const boilerplates = {
  javascript: `// JavaScript Environment (Node / Web)\n// Space CRDT & Live WebSocket Buffer Active\nfunction syncArchitecture() {\n  const message = "WebSocket & CRDT synced successfully.";\n  console.log(message);\n  return true;\n}\n\nsyncArchitecture();`,
  python: `# Python Environment\n# Space CRDT & Live WebSocket Buffer Active\ndef sync_architecture():\n    message = "WebSocket & CRDT synced successfully."\n    print(message)\n    return True\n\nsync_architecture()`,
  cpp: `// C++ Environment\n// Space CRDT & Live WebSocket Buffer Active\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "WebSocket & CRDT synced successfully." << endl;\n    return 0;\n}`
};

const CodeEditor = ({ roomId = 'demo-room' }) => {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(boilerplates.javascript);
  const [theme, setTheme] = useState('dark');

  const targetRoom = roomId || 'demo-room';

  useEffect(() => {
    const handleRemoteCode = (data) => {
      if (typeof data === 'string') {
        setCode(data);
      } else if (data && typeof data === 'object') {
        if (data.code !== undefined && data.code !== code) {
          setCode(data.code);
        }
        if (data.language) {
          setLanguage(data.language);
        }
      }
    };

    socket.on('code-change', handleRemoteCode);
    return () => {
      socket.off('code-change', handleRemoteCode);
    };
  }, [targetRoom, code]);

  const onLanguageSelect = (e) => {
    const selected = e.target.value;
    setLanguage(selected);
    const newCode = boilerplates[selected] || '';
    setCode(newCode);
    socket.emit('code-change', { room: targetRoom, code: newCode, language: selected });
  };

  const onCodeChange = (e) => {
    const newCode = e.target.value;
    setCode(newCode);
    socket.emit('code-change', { room: targetRoom, code: newCode, language });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: theme === 'dark' ? '#0f172a' : '#ffffff' }}>
      {/* Editor Chrome Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: theme === 'dark' ? '#0b0f19' : '#f8fafc',
        borderBottom: theme === 'dark' ? '1px solid #1e293b' : '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span className="caption" style={{ color: theme === 'dark' ? '#94a3b8' : '#6b7280' }}>LANGUAGE:</span>
          <select 
            value={language} 
            onChange={onLanguageSelect}
            style={{
              background: theme === 'dark' ? '#1e293b' : '#ffffff',
              color: theme === 'dark' ? '#ffffff' : '#000000',
              border: '1px solid #475569',
              padding: '4px 10px',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
          </select>

          <span className="caption" style={{ color: theme === 'dark' ? '#94a3b8' : '#6b7280', marginLeft: '6px' }}>THEME:</span>
          <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value)}
            style={{
              background: theme === 'dark' ? '#1e293b' : '#ffffff',
              color: theme === 'dark' ? '#ffffff' : '#000000',
              border: '1px solid #475569',
              padding: '4px 10px',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            <option value="dark">Dark Theme</option>
            <option value="light">Light Theme</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
          <span className="caption" style={{ color: '#10b981' }}>Yjs &amp; Space Buffer Active</span>
        </div>
      </div>

      <textarea
        value={code}
        onChange={onCodeChange}
        spellCheck="false"
        style={{
          flex: 1,
          width: '100%',
          padding: '20px',
          background: theme === 'dark' ? '#0b0f19' : '#f8fafc',
          color: theme === 'dark' ? '#38bdf8' : '#0f172a',
          fontFamily: 'Consolas, "JetBrains Mono", monospace',
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