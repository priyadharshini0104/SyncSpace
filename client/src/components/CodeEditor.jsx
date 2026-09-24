import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
export default function CodeEditor({ onEditorMount, language = 'javascript', theme = 'vs-dark' }) {
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [currentLang, setCurrentLang] = useState(language);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#1e1e1e' }}>
      <div style={{ padding: '8px 12px', background: '#252526', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid #333' }}>
        <span style={{ color: '#ccc', fontSize: '13px', fontWeight: 'bold' }}>Editor</span>
        <select 
          value={currentLang} 
          onChange={(e) => setCurrentLang(e.target.value)}
          style={{ background: '#3c3c3c', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px' }}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
          <option value="html">HTML</option>
        </select>
        <select 
          value={currentTheme} 
          onChange={(e) => setCurrentTheme(e.target.value)}
          style={{ background: '#3c3c3c', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px' }}
        >
          <option value="vs-dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          language={currentLang}
          theme={currentTheme}
          defaultValue="// Happy Collaborating in SyncSpace!\nfunction sync() {\n  return true;\n}\n"
          onMount={onEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true
          }}
        />
      </div>
    </div>
  );
}
