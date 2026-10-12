import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import socket from '../socket';

// Helper to determine language from file extension
const getLanguageFromFileName = (fileName = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
    case 'h':
      return 'cpp';
    case 'c':
      return 'c';
    case 'java':
      return 'java';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'sql':
      return 'sql';
    case 'sh':
      return 'shell';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    default:
      return 'plaintext';
  }
};

// File extension badge visual metadata
const getFileBadge = (fileName = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
      return { label: 'JS', color: '#eab308', bg: '#fef9c3' };
    case 'ts':
    case 'tsx':
      return { label: 'TS', color: '#2563eb', bg: '#eff6ff' };
    case 'py':
      return { label: 'PY', color: '#0284c7', bg: '#e0f2fe' };
    case 'cpp':
    case 'c':
      return { label: 'C++', color: '#059669', bg: '#ecfdf5' };
    case 'java':
      return { label: 'JV', color: '#dc2626', bg: '#fef2f2' };
    case 'html':
      return { label: '<>', color: '#ea580c', bg: '#fff7ed' };
    case 'css':
      return { label: '#', color: '#9333ea', bg: '#faf5ff' };
    case 'json':
      return { label: '{}', color: '#475569', bg: '#f1f5f9' };
    default:
      return { label: 'FILE', color: '#64748b', bg: '#f8fafc' };
  }
};

// Starter templates for new files
const getStarterCode = (fileName = '') => {
  const lang = getLanguageFromFileName(fileName);
  switch (lang) {
    case 'javascript':
      return `// JavaScript (Node.js)\nconsole.log("Hello from SyncSpace VS Code!");\n\nfunction main() {\n  const now = new Date().toLocaleTimeString();\n  console.log("Executed at:", now);\n}\n\nmain();\n`;
    case 'python':
      return `# Python 3\nprint("Hello from SyncSpace VS Code!")\n\ndef main():\n    nums = [1, 2, 3, 4, 5]\n    print("Calculated squares:", [x**2 for x in nums])\n\nif __name__ == "__main__":\n    main()\n`;
    case 'cpp':
      return `// C++ Environment (GCC)\n#include <iostream>\n#include <vector>\n\nint main() {\n    std::cout << "Hello from SyncSpace C++!" << std::endl;\n    std::vector<int> numbers = {10, 20, 30};\n    int sum = 0;\n    for (int n : numbers) sum += n;\n    std::cout << "Sum: " << sum << std::endl;\n    return 0;\n}\n`;
    case 'c':
      return `// C Environment (GCC)\n#include <stdio.h>\n\nint main() {\n    printf("Hello from SyncSpace C!\\n");\n    return 0;\n}\n`;
    case 'java':
      return `// Java Environment\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from SyncSpace Java!");\n    }\n}\n`;
    case 'html':
      return `<!DOCTYPE html>\n<html>\n<head>\n  <title>SyncSpace Page</title>\n</head>\n<body>\n  <h1>Hello from SyncSpace!</h1>\n</body>\n</html>\n`;
    case 'css':
      return `/* Stylesheet */\nbody {\n  margin: 0;\n  font-family: sans-serif;\n  background-color: #ffffff;\n}\n`;
    case 'json':
      return `{\n  "name": "syncspace-project",\n  "version": "1.0.0"\n}\n`;
    default:
      return `// New file: ${fileName}\n`;
  }
};

const defaultInitialFiles = [
  {
    id: 'file-1',
    name: 'index.js',
    language: 'javascript',
    content: `// SyncSpace JavaScript Environment (Node.js)\nconsole.log("Welcome to SyncSpace VS Code Editor!");\n\nfunction calculate() {\n  const a = 15;\n  const b = 27;\n  console.log("Result:", a + b);\n}\n\ncalculate();`
  },
  {
    id: 'file-2',
    name: 'main.py',
    language: 'python',
    content: `# SyncSpace Python Environment\nprint("Welcome to SyncSpace Python!")\n\ndef fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        yield a\n        a, b = b, a + b\n\nprint("First 8 Fibonacci numbers:", list(fibonacci(8)))`
  },
  {
    id: 'file-3',
    name: 'solution.cpp',
    language: 'cpp',
    content: `// SyncSpace C++ Environment\n#include <iostream>\n#include <vector>\n\nint main() {\n    std::cout << "Welcome to SyncSpace C++!" << std::endl;\n    std::vector<int> numbers = {1, 2, 3, 4, 5};\n    int sum = 0;\n    for (int n : numbers) sum += n;\n    std::cout << "Sum: " << sum << std::endl;\n    return 0;\n}`
  }
];

const CodeEditor = ({ roomId = 'demo-room', currentUser }) => {
  const [files, setFiles] = useState(defaultInitialFiles);
  const [activeFileId, setActiveFileId] = useState('file-1');
  const [theme, setTheme] = useState('vs-dark'); // 'vs-dark' | 'vs-light'
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Terminal & Execution State
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState('Terminal ready. Click "▶ Run Code" or press Ctrl+Enter to execute.');
  const [terminalError, setTerminalError] = useState(false);
  const [terminalMeta, setTerminalMeta] = useState('');
  const [stdinInput, setStdinInput] = useState('');

  // Collaborator Activity Notice
  const [collaboratorNotice, setCollaboratorNotice] = useState(null);
  const noticeTimerRef = useRef(null);

  // Synchronous references & Monaco Instance
  const editorRef = useRef(null);
  const isRemoteUpdateRef = useRef(false);
  const filesRef = useRef(files);
  const activeFileIdRef = useRef(activeFileId);
  const targetRoom = roomId || 'demo-room';

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  const activeFile = files.find((f) => f.id === activeFileId) || files[0] || {
    id: 'file-fallback',
    name: 'untitled.txt',
    language: 'plaintext',
    content: ''
  };

  const showCollaboratorNotice = useCallback((text) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setCollaboratorNotice(text);
    noticeTimerRef.current = setTimeout(() => {
      setCollaboratorNotice(null);
    }, 3500);
  }, []);

  // Socket Synchronization Lifecycle
  useEffect(() => {
    // Request current workspace files from server immediately on mount
    socket.emit('get-code-files', { room: targetRoom });

    const handleInitialFiles = (initialFiles) => {
      if (Array.isArray(initialFiles) && initialFiles.length > 0) {
        setFiles(initialFiles);
        filesRef.current = initialFiles;
        if (!initialFiles.some((f) => f.id === activeFileIdRef.current)) {
          setActiveFileId(initialFiles[0].id);
        }
      }
    };

    const handleFileUpdate = (data) => {
      if (!data || !data.fileId) return;

      // If active in Monaco Editor, apply edits cleanly without resetting cursor or bounce
      if (editorRef.current && data.fileId === activeFileIdRef.current) {
        const currentVal = editorRef.current.getValue();
        if (currentVal !== data.content) {
          isRemoteUpdateRef.current = true;
          const model = editorRef.current.getModel();
          if (model) {
            const position = editorRef.current.getPosition();
            const selections = editorRef.current.getSelections();
            editorRef.current.executeEdits('remote-sync', [{
              range: model.getFullModelRange(),
              text: data.content,
              forceMoveMarkers: true
            }]);
            editorRef.current.pushUndoStop();
            if (position) editorRef.current.setPosition(position);
            if (selections) editorRef.current.setSelections(selections);
          }
          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 60);
        }
      }

      setFiles((prev) => {
        const updated = prev.map((f) => (f.id === data.fileId ? { ...f, content: data.content } : f));
        filesRef.current = updated;
        return updated;
      });

      if (data.author && data.author !== (currentUser?.name || 'You')) {
        showCollaboratorNotice(`✏️ ${data.author} is editing ${data.fileName || 'code'}`);
      }
    };

    const handleFilesChange = (data) => {
      if (!data || !Array.isArray(data.files)) return;
      setFiles(data.files);
      filesRef.current = data.files;
      if (!data.files.some((f) => f.id === activeFileIdRef.current)) {
        setActiveFileId(data.files[0]?.id || '');
      }
      if (data.notice) {
        showCollaboratorNotice(data.notice);
      }
    };

    const handleRunEvent = (data) => {
      if (!data) return;
      setTerminalOpen(true);
      setTerminalOutput(data.stdout || (data.stderr ? '' : '(No output returned)'));
      setTerminalError(Boolean(data.stderr && !data.stdout));
      setTerminalMeta(`Ran by ${data.author || 'Collaborator'} in ${data.elapsed || '0s'} • Exit code: ${data.exitCode}`);
      showCollaboratorNotice(`▶ ${data.author || 'Collaborator'} ran ${data.fileName || 'code'}`);
    };

    socket.on('initial-code-files', handleInitialFiles);
    socket.on('code-file-update', handleFileUpdate);
    socket.on('code-files-change', handleFilesChange);
    socket.on('code-run-event', handleRunEvent);

    return () => {
      socket.off('initial-code-files', handleInitialFiles);
      socket.off('code-file-update', handleFileUpdate);
      socket.off('code-files-change', handleFilesChange);
      socket.off('code-run-event', handleRunEvent);
    };
  }, [targetRoom, currentUser, showCollaboratorNotice]);

  // Handle local text edit in Monaco Editor
  const handleEditorChange = (newContent) => {
    if (isRemoteUpdateRef.current) return;

    const updatedContent = newContent || '';
    setFiles((prev) => {
      const updated = prev.map((f) => (f.id === activeFileId ? { ...f, content: updatedContent } : f));
      filesRef.current = updated;
      return updated;
    });

    // Broadcast change to room
    socket.emit('code-file-update', {
      room: targetRoom,
      fileId: activeFileId,
      fileName: activeFile.name,
      content: updatedContent,
      author: currentUser?.name || 'Collaborator'
    });
  };

  // Create a new file
  const handleCreateFile = () => {
    const fileName = prompt('Enter new file name (e.g., script.py, app.js, solution.cpp):');
    if (!fileName || !fileName.trim()) return;

    const trimmed = fileName.trim();
    if (files.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
      alert(`A file named "${trimmed}" already exists in this workspace.`);
      return;
    }

    const newId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newFile = {
      id: newId,
      name: trimmed,
      language: getLanguageFromFileName(trimmed),
      content: getStarterCode(trimmed)
    };

    const updated = [...files, newFile];
    setFiles(updated);
    filesRef.current = updated;
    setActiveFileId(newId);

    const notice = `📁 ${currentUser?.name || 'Someone'} created ${trimmed}`;
    showCollaboratorNotice(notice);

    socket.emit('code-files-change', {
      room: targetRoom,
      files: updated,
      notice
    });
  };

  // Rename a file
  const handleRenameFile = (fileId, currentName, e) => {
    e.stopPropagation();
    const newName = prompt('Enter new file name:', currentName);
    if (!newName || !newName.trim() || newName.trim() === currentName) return;

    const trimmed = newName.trim();
    if (files.some((f) => f.id !== fileId && f.name.toLowerCase() === trimmed.toLowerCase())) {
      alert(`A file named "${trimmed}" already exists.`);
      return;
    }

    const updated = files.map((f) =>
      f.id === fileId
        ? {
            ...f,
            name: trimmed,
            language: getLanguageFromFileName(trimmed)
          }
        : f
    );

    setFiles(updated);
    filesRef.current = updated;

    const notice = `✏️ ${currentUser?.name || 'Someone'} renamed ${currentName} to ${trimmed}`;
    showCollaboratorNotice(notice);

    socket.emit('code-files-change', {
      room: targetRoom,
      files: updated,
      notice
    });
  };

  // Delete a file
  const handleDeleteFile = (fileId, fileName, e) => {
    e.stopPropagation();
    if (files.length <= 1) {
      alert('You cannot delete the only remaining file in the workspace.');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete "${fileName}"?`);
    if (!confirmed) return;

    const updated = files.filter((f) => f.id !== fileId);
    setFiles(updated);
    filesRef.current = updated;

    if (activeFileId === fileId) {
      setActiveFileId(updated[0].id);
    }

    const notice = `🗑 ${currentUser?.name || 'Someone'} deleted ${fileName}`;
    showCollaboratorNotice(notice);

    socket.emit('code-files-change', {
      room: targetRoom,
      files: updated,
      notice
    });
  };

  // Export currently active file as a downloaded file
  const handleExportCurrentFile = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFile.name || 'code.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export entire workspace as a downloadable .ZIP archive
  const handleExportProjectZip = async () => {
    try {
      const zip = new JSZip();
      files.forEach((f) => {
        zip.file(f.name, f.content || '');
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `syncspace-${targetRoom}-workspace.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create zip:', err);
      alert('Could not export project zip.');
    }
  };

  // Compile and run the active file
  const handleRunCode = async () => {
    if (!activeFile) return;
    setIsRunning(true);
    setTerminalOpen(true);
    setTerminalOutput('⏳ Compiling and executing code via online compiler engine...');
    setTerminalError(false);
    setTerminalMeta('');

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiBase}/api/compile/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: activeFile.language,
          code: activeFile.content || '',
          stdin: stdinInput
        })
      });

      const data = await res.json();
      setIsRunning(false);

      if (!res.ok || !data.success) {
        setTerminalError(true);
        const errText = data.error || data.stderr || 'Execution failed';
        setTerminalOutput(errText);
        setTerminalMeta(`Execution error • ${data.elapsed || '0s'}`);
        return;
      }

      const out = data.stdout || '';
      const err = data.stderr || '';
      const combined = out + (err ? `\n--- Standard Error ---\n${err}` : '');

      setTerminalOutput(combined.trim() ? combined : '(Process finished with no output)');
      setTerminalError(Boolean(err && !out));
      setTerminalMeta(`Finished in ${data.elapsed} • Exit code: ${data.exitCode} (${data.compiler})`);

      // Broadcast execution event to all room participants
      socket.emit('code-run-event', {
        room: targetRoom,
        fileName: activeFile.name,
        stdout: out,
        stderr: err,
        elapsed: data.elapsed,
        exitCode: data.exitCode,
        author: currentUser?.name || 'You'
      });
    } catch (err) {
      setIsRunning(false);
      setTerminalError(true);
      setTerminalOutput(`Could not connect to compiler runner server: ${err.message}`);
    }
  };

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to Run Code
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, stdinInput]);

  const isDark = theme === 'vs-dark';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
      color: isDark ? '#cccccc' : '#333333',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative'
    }}>
      {/* Top VS Code Chrome Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 14px',
        backgroundColor: isDark ? '#252526' : '#f3f4f6',
        borderBottom: isDark ? '1px solid #333333' : '1px solid #e5e7eb',
        zIndex: 10,
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        {/* Left: Sidebar Toggle, Explorer Label, Active File Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'transparent',
              border: isDark ? '1px solid #3c3c3c' : '1px solid #d1d5db',
              color: isDark ? '#cccccc' : '#374151',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title={sidebarOpen ? 'Hide File Explorer Sidebar' : 'Show File Explorer Sidebar'}
          >
            <span>📁</span>
            <span>{sidebarOpen ? 'Hide Files' : 'Files'}</span>
          </button>

          <span style={{
            fontSize: '11px',
            fontWeight: '600',
            color: isDark ? '#9cdcfe' : '#0284c7',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>Editing:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{activeFile.name}</span>
          </span>
        </div>

        {/* Right: Actions (Run, Export, Zip, Theme) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* GREEN RUN BUTTON (Piston / Wandbox Online Runner) */}
          <button
            type="button"
            onClick={handleRunCode}
            disabled={isRunning}
            style={{
              backgroundColor: isRunning ? '#059669' : '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              padding: '5px 14px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: isRunning ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
            }}
            title="Compile & Run current code in cloud sandbox (Ctrl+Enter)"
          >
            <span>{isRunning ? '⏳ Running...' : '▶ Run Code'}</span>
            <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 'normal' }}>(Ctrl+Enter)</span>
          </button>

          {/* EXPORT CURRENT FILE */}
          <button
            type="button"
            onClick={handleExportCurrentFile}
            style={{
              background: isDark ? '#2d2d2d' : '#ffffff',
              color: isDark ? '#e0e0e0' : '#374151',
              border: isDark ? '1px solid #454545' : '1px solid #d1d5db',
              borderRadius: '9999px',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title="Download active file to your computer"
          >
            💾 Export File
          </button>

          {/* EXPORT ALL FILES AS ZIP */}
          <button
            type="button"
            onClick={handleExportProjectZip}
            style={{
              background: isDark ? '#2d2d2d' : '#ffffff',
              color: isDark ? '#e0e0e0' : '#374151',
              border: isDark ? '1px solid #454545' : '1px solid #d1d5db',
              borderRadius: '9999px',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title="Download entire project workspace as a .zip file"
          >
            📦 Download Zip
          </button>

          {/* THEME TOGGLE */}
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'vs-light' : 'vs-dark')}
            style={{
              background: 'transparent',
              color: isDark ? '#aaaaaa' : '#666666',
              border: isDark ? '1px solid #454545' : '1px solid #d1d5db',
              borderRadius: '9999px',
              padding: '5px 10px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
            title="Toggle editor theme (Dark/Light)"
          >
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </div>

      {/* Collaborator Activity Notification Toast */}
      {collaboratorNotice && (
        <div style={{
          position: 'absolute',
          top: '48px',
          right: '20px',
          backgroundColor: '#10b981',
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: '600',
          padding: '4px 12px',
          borderRadius: '9999px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 50,
          animation: 'fadeIn 0.15s ease'
        }}>
          {collaboratorNotice}
        </div>
      )}

      {/* Main VS Code Workspace Split: File Explorer + Editor Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT SIDEBAR: FILE EXPLORER */}
        {sidebarOpen && (
          <div style={{
            width: '210px',
            backgroundColor: isDark ? '#252526' : '#f8fafc',
            borderRight: isDark ? '1px solid #333333' : '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            userSelect: 'none'
          }}>
            {/* Sidebar Title & New File Button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: isDark ? '1px solid #2d2d2d' : '1px solid #e2e8f0'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', color: isDark ? '#bbbbbb' : '#475569' }}>
                EXPLORER
              </span>
              <button
                type="button"
                onClick={handleCreateFile}
                style={{
                  background: isDark ? '#333333' : '#e2e8f0',
                  color: isDark ? '#ffffff' : '#0f172a',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
                title="Create a new file"
              >
                + New File
              </button>
            </div>

            {/* File List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
              {files.map((file) => {
                const badge = getFileBadge(file.name);
                const isActive = file.id === activeFileId;
                return (
                  <div
                    key={file.id}
                    onClick={() => setActiveFileId(file.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      backgroundColor: isActive
                        ? (isDark ? '#37373d' : '#e0f2fe')
                        : 'transparent',
                      borderLeft: isActive ? '3px solid #007acc' : '3px solid transparent',
                      color: isActive
                        ? (isDark ? '#ffffff' : '#0369a1')
                        : (isDark ? '#cccccc' : '#334155'),
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '700',
                        color: badge.color,
                        backgroundColor: badge.bg,
                        padding: '1px 4px',
                        borderRadius: '3px'
                      }}>
                        {badge.label}
                      </span>
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </span>
                    </div>

                    {/* Rename & Delete Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={(e) => handleRenameFile(file.id, file.name, e)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isDark ? '#888888' : '#94a3b8',
                          cursor: 'pointer',
                          padding: '1px 3px',
                          fontSize: '11px'
                        }}
                        title="Rename file"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteFile(file.id, file.name, e)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isDark ? '#888888' : '#94a3b8',
                          cursor: 'pointer',
                          padding: '1px 3px',
                          fontSize: '11px'
                        }}
                        title="Delete file"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RIGHT AREA: TAB BAR + MONACO EDITOR + TERMINAL OUTPUT */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* File Tab Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: isDark ? '#252526' : '#f1f5f9',
            borderBottom: isDark ? '1px solid #1e1e1e' : '1px solid #e2e8f0',
            overflowX: 'auto',
            scrollbarWidth: 'none'
          }}>
            {files.map((file) => {
              const badge = getFileBadge(file.name);
              const isActive = file.id === activeFileId;
              return (
                <div
                  key={file.id}
                  onClick={() => setActiveFileId(file.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    cursor: 'pointer',
                    backgroundColor: isActive
                      ? (isDark ? '#1e1e1e' : '#ffffff')
                      : 'transparent',
                    borderRight: isDark ? '1px solid #2d2d2d' : '1px solid #e2e8f0',
                    borderTop: isActive ? '2px solid #007acc' : '2px solid transparent',
                    color: isActive
                      ? (isDark ? '#ffffff' : '#0f172a')
                      : (isDark ? '#969696' : '#64748b'),
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ fontSize: '9px', fontWeight: '700', color: badge.color }}>
                    {badge.label}
                  </span>
                  <span>{file.name}</span>
                  {files.length > 1 && (
                    <span
                      onClick={(e) => handleDeleteFile(file.id, file.name, e)}
                      style={{
                        marginLeft: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        color: isDark ? '#666666' : '#94a3b8'
                      }}
                      title="Close file"
                    >
                      ✕
                    </span>
                  )}
                </div>
              );
            })}

            {/* Quick Add Tab Button */}
            <button
              type="button"
              onClick={handleCreateFile}
              style={{
                background: 'transparent',
                border: 'none',
                color: isDark ? '#888888' : '#64748b',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
              title="Add new file"
            >
              +
            </button>
          </div>

          {/* Monaco Code Editor */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <Editor
              height="100%"
              language={activeFile.language}
              theme={theme}
              value={activeFile.content}
              onChange={handleEditorChange}
              onMount={(editor) => {
                editorRef.current = editor;
              }}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                fontFamily: 'Consolas, "JetBrains Mono", "Fira Code", monospace',
                lineHeight: 22,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                bracketPairColorization: { enabled: true },
                cursorSmoothCaretAnimation: 'on',
                formatOnPaste: true,
                suggestOnTriggerCharacters: true
              }}
            />
          </div>

          {/* BOTTOM TERMINAL / COMPILER OUTPUT DRAWER */}
          {terminalOpen && (
            <div style={{
              height: '180px',
              backgroundColor: isDark ? '#181818' : '#0f172a',
              color: '#f8fafc',
              borderTop: isDark ? '2px solid #007acc' : '2px solid #0284c7',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Consolas, "JetBrains Mono", monospace'
            }}>
              {/* Terminal Title Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 14px',
                backgroundColor: isDark ? '#1e1e1e' : '#1e293b',
                borderBottom: isDark ? '1px solid #2d2d2d' : '1px solid #334155'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', color: '#38bdf8' }}>
                    TERMINAL / OUTPUT
                  </span>
                  {terminalMeta && (
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      ({terminalMeta})
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Standard Input Field */}
                  <input
                    type="text"
                    value={stdinInput}
                    onChange={(e) => setStdinInput(e.target.value)}
                    placeholder="stdin input (optional)"
                    style={{
                      backgroundColor: isDark ? '#2d2d2d' : '#0f172a',
                      color: '#ffffff',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      width: '160px'
                    }}
                    title="Provide stdin input for programs requiring input()"
                  />

                  <button
                    type="button"
                    onClick={() => setTerminalOutput('Terminal cleared.')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                    title="Clear terminal output"
                  >
                    🗑 Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => setTerminalOpen(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                    title="Close terminal"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Terminal Output Text */}
              <pre style={{
                flex: 1,
                margin: 0,
                padding: '10px 16px',
                overflowY: 'auto',
                fontSize: '13px',
                lineHeight: '1.5',
                color: terminalError ? '#f87171' : '#4ade80',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {terminalOutput}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;