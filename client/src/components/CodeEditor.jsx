import React, { useState } from 'react';

const boilerplates = {
  javascript: `// JavaScript Environment (Node / Web)\nfunction syncArchitecture() {\n  const message = "WebSocket & CRDT synced successfully.";\n  console.log(message);\n  return true;\n}\n\nsyncArchitecture();`,
  python: `# Python Environment\ndef sync_architecture():\n    message = "WebSocket & CRDT synced successfully."\n    print(message)\n    return True\n\nsync_architecture()`,
  cpp: `// C++ Environment\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "WebSocket & CRDT synced successfully." << endl;\n    return 0;\n}`
};

const CodeEditor = () => {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(boilerplates.javascript);
  const [theme, setTheme] = useState('dark');

  const onLanguageSelect = (e) => {
    const selected = e.target.value;
    setLanguage(selected);
    setCode(boilerplates[selected] || '');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: theme === 'dark' ? '#0f172a' : '#ffffff' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: '#1e293b',
        borderBottom: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold' }}>Language:</span>
          <select 
            value={language} 
            onChange={onLanguageSelect}
            style={{ background: '#0f172a', color: '#fff', border: '1px solid #475569', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
          </select>

          <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold', marginLeft: '6px' }}>Theme:</span>
          <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value)}
            style={{ background: '#0f172a', color: '#fff', border: '1px solid #475569', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
          >
            <option value="dark">Dark Theme</option>
            <option value="light">Light Theme</option>
          </select>
        </div>
        <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>● CRDT & Editor Active</span>
      </div>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck="false"
        style={{
          flex: 1,
          width: '100%',
          padding: '16px',
          background: theme === 'dark' ? '#0b0f19' : '#f8fafc',
          color: theme === 'dark' ? '#38bdf8' : '#0f172a',
          fontFamily: 'Consolas, "Fira Code", monospace',
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