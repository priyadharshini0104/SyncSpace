# SyncSpace — Week 3 Complete Team Deliverables & Engineering Report

> **Project:** SyncSpace — Real-Time Collaborative Workspace & Architecture IDE  
> **Phase:** Week 3 (Monaco Code Editor Embedding, Yjs CRDT Text Binding & State Persistence Engine)  
> **Status:** Completed Ahead of Schedule (Integrated into `member1-lead`)  

---

## 1. Executive Summary & Week 3 Objective

During **Week 3**, SyncSpace evolved into a dual-engine architecture: combining the collaborative whiteboard with a **concurrent multi-user code editor**. The primary goals were:
1. Embed the Monaco Code Editor with multi-language syntax and theme switching.
2. Mathematically bind the Monaco editor to a shared Yjs `Y.Text` CRDT type (`y-monaco`) for sub-second, conflict-free collaborative typing.
3. Expand WebSocket event pipelines for real-time code updates and language synchronization.
4. Build a background debounced persistence worker to serialize CRDT states into binary buffers.
5. Implement database controller endpoints in Express/MongoDB to store, retrieve, and restore document states upon server restart.

---

## 2. Complete Member-by-Member Breakdown (M1 to M6)

---

### 👑 Member 1 (Lead): Architecture Review, PR Merging & Commit Compliance
* **Branch:** `member1-lead`
* **Key Files:**
  * [`architecture.md:L24-L30`](file:///c:/Users/fenil/Downloads/SyncSpace-main/SyncSpace-main/architecture.md#L24-L30)
* **Code Reference:**
  ```markdown
  ## Week 3 Integration: Monaco Editor & Persistent State Engine
  - Dual-pane layout integrated with Monaco Code Editor.
  - Shared text binding wired via y-monaco directly to Yjs CRDT model.
  - Socket.io pipeline extended for code updates and language switching.
  - Debounced binary serialization worker configured for periodic MongoDB saves.
  - Document recovery controller active to reload binary state on server restarts.
  ```
* **Deliverables Completed:**
  1. **Architecture Extension:** Documented the dual-pane layout contract and persistence loop in `architecture.md`.
  2. **Branch Merging Ahead of Schedule:** Audited and integrated PRs from `member2-ui`, `member3-canvas`, `member4-backend`, `member5-crdt`, and `member6-database`.
  3. **Axlero Compliance Tracking:** Verified zero-gap daily commit history across all team member branches prior to mid-review evaluations.

---

### 💻 Member 2 (Priyanka): Monaco Editor UI, Languages & Theme Selection
* **Branch:** `member2-ui`
* **Key Files:**
  * [`client/src/components/CodeEditor.jsx:L1-L77`](file:///c:/Users/fenil/Downloads/SyncSpace-main/SyncSpace-main/client/src/components/CodeEditor.jsx#L1-L77)
* **Code Reference:**
  ```javascript
  // client/src/components/CodeEditor.jsx (Lines 3-19)
  const boilerplates = {
    javascript: `// JavaScript Environment (Node / Web)\nfunction syncArchitecture() {\n  const message = "WebSocket & CRDT synced successfully.";\n  console.log(message);\n  return true;\n}\n\nsyncArchitecture();`,
    python: `# Python Environment\ndef sync_architecture():\n    message = "WebSocket & CRDT synced successfully."\n    print(message)\n    return True\n\nsync_architecture()`,
    cpp: `// C++ Environment\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "WebSocket & CRDT synced successfully." << endl;\n    return 0;\n}`
  };

  const CodeEditor = () => {
    const [language, setLanguage] = useState('javascript');
    const [code, setCode] = useState(boilerplates.javascript);
    const [theme, setTheme] = useState('dark');
  ```
* **Deliverables Completed:**
  1. **Dual-Pane Right Pane Layout:** Integrated the editor workspace into the right half of the screen alongside the canvas board.
  2. **Multi-Language Selector:** Implemented language switching ([Lines 32–40](file:///c:/Users/fenil/Downloads/SyncSpace-main/SyncSpace-main/client/src/components/CodeEditor.jsx#L32-L40)) supporting JavaScript, Python, and C++ with automated boilerplate hydration.
  3. **Dynamic Theme Switching:** Built dark (`#0f172a`) and light (`#ffffff`) theme controls ([Lines 42–50](file:///c:/Users/fenil/Downloads/SyncSpace-main/SyncSpace-main/client/src/components/CodeEditor.jsx#L42-L50)) with live status badges (`● CRDT & Editor Active`).

---

### 🧬 Member 3 (Fenil): Monaco-Yjs CRDT Text Binding (`y-monaco`)
* **Branch:** `member3-canvas`
* **Key Files:**
  * [`client/src/components/MonacoYjsBinding.jsx:L1-L27`](file:///c:/Users/fenil/Downloads/SyncSpace-main/SyncSpace-main/client/src/components/MonacoYjsBinding.jsx#L1-L27)
* **Code Reference:**
  ```javascript
  // client/src/components/MonacoYjsBinding.jsx (Lines 4-26)
  import React, { useEffect, useRef } from 'react';
  import * as Y from 'yjs';
  import { MonacoBinding } from 'y-monaco';

  export default function useMonacoYjs({ editorRef, ydoc, awareness, fieldName = 'monaco' }) {
    const bindingRef = useRef(null);

    useEffect(() => {
      if (!editorRef || !ydoc) return;
      const ytext = ydoc.getText(fieldName);
      const model = editorRef.getModel();

      if (model && !bindingRef.current) {
        bindingRef.current = new MonacoBinding(
          ytext,
          model,
          new Set([editorRef]),
          awareness
        );
      }

      return () => {
        if (bindingRef.current) {
          bindingRef.current.destroy();
          bindingRef.current = null;
        }
      };
    }, [editorRef, ydoc, awareness, fieldName]);

    return bindingRef;
  }
  ```
* **Deliverables Completed:**
  1. **Yjs CRDT Text Synchronization:** Created the `useMonacoYjs` hook binding Monaco's `ITextModel` directly to `ydoc.getText('monaco')`.
  2. **Conflict-Free Concurrent Typing:** Replaced naive string overwrites with character-level CRDT inserts/deletes, guaranteeing convergence without cursor displacement or merge conflicts.
  3. **Infinite Loop Prevention:** Used `MonacoBinding` to distinguish local keyboard input from remote WebSocket operations, blocking recursive event loops.
  4. **Memory Leak Prevention:** Built strict cleanup logic ([Lines 18–23](file:///c:/Users/fenil/Downloads/SyncSpace-main/SyncSpace-main/client/src/components/MonacoYjsBinding.jsx#L18-L23)) invoking `binding.destroy()` when switching rooms or unmounting.

---

### ⚡ Member 4 (Atul): Socket.io Code Pipeline & Language Sync
* **Branch:** `member4-backend`
* **Key Files:**
  * [`server/src/editorSync.js:L1-L9`](file:///c:/Users/fenil/Downloads/SyncSpace-main/SyncSpace-main/server/src/editorSync.js#L1-L9)
  * [`server/server.js:L82-L84`](file:///c:/Users/fenil/Downloads/SyncSpace-main/SyncSpace-main/server/server.js#L82-L84)
* **Code Reference:**
  ```javascript
  // server/src/editorSync.js (Lines 1-8)
  export function setupEditorSync(io, socket) {
    socket.on('editor-update', ({ roomId, update }) => {
      socket.to(roomId).emit('editor-update', update);
    });
    socket.on('language-change', ({ roomId, language }) => {
      socket.to(roomId).emit('language-change', { language });
    });
  }
  ```
  ```javascript
  // server/server.js (Lines 82-84)
  socket.on('code-change', (data) => {
    socket.to(data.room || 'demo-room').emit('code-change', data);
  });
  ```
* **Deliverables Completed:**
  1. **Code Event Channels:** Implemented `editor-update` and `code-change` socket listeners to route editor payloads strictly within room boundaries.
  2. **Language Synchronization:** Built `language-change` event pipeline so when a collaborator switches languages (e.g. JavaScript to Python), peers in the same room update synchronously.

---

### ⏱️ Member 5 (Pradip): Server-Side Debounced Persistence Engine
* **Branch:** `member5-crdt`
* **Key Files:**
  * [`server/src/persistenceWorker.js:L1-L27`](file:///c:/Users/fenil/Downloads/SyncSpace-main/SyncSpace-main/server/src/persistenceWorker.js#L1-L27)
* **Code Reference:**
  ```javascript
  // server/src/persistenceWorker.js (Lines 3-26)
  import * as Y from 'yjs';
  import Document from '../models/Document.js';

  const saveTimers = new Map();

  export function scheduleDocumentSave(roomId, ydoc, delayMs = 3000) {
    if (saveTimers.has(roomId)) {
      clearTimeout(saveTimers.get(roomId));
    }
    const timer = setTimeout(async () => {
      try {
        const stateVector = Y.encodeStateAsUpdate(ydoc);
        const binaryBuffer = Buffer.from(stateVector);
        await Document.findOneAndUpdate(
          { roomId },
          { data: binaryBuffer, updatedAt: new Date() },
          { upsert: true, new: true }
        );
        saveTimers.delete(roomId);
      } catch (err) {
        console.error('Error auto-persisting Yjs state:', err);
      }
    }, delayMs);
    saveTimers.set(roomId, timer);
  }
  ```
* **Deliverables Completed:**
  1. **Debounced Persistence Engine:** Built `scheduleDocumentSave` with a 3000ms debounce interval, buffering fast bursts of keystrokes to prevent MongoDB write saturation.
  2. **Binary Buffer Serialization:** Encoded Yjs documents directly into state vector update buffers (`Y.encodeStateAsUpdate(ydoc)`) before persisting as native Node.js `Buffer` objects.
  3. **Upsert Logic:** Guaranteed continuous room availability by utilizing `{ upsert: true }` in Mongoose queries.

---

### 🗄️ Member 6 (Gagan): Document State Controllers & Session Recovery
* **Branch:** `member6-database`
* **Key Files:**
  * [`server/controllers/documentController.js:L1-L48`](file:///c:/Users/fenil/Downloads/SyncSpace-main/SyncSpace-main/server/controllers/documentController.js#L1-L48)
* **Code Reference:**
  ```javascript
  // server/controllers/documentController.js (Lines 2-27)
  import Document from '../models/Document.js';

  export async function getDocumentState(req, res) {
    try {
      const { roomId } = req.params;
      const doc = await Document.findOne({ roomId });
      if (!doc) return res.status(404).json({ message: 'Document not found for this room' });
      return res.status(200).json({ roomId: doc.roomId, data: doc.data, updatedAt: doc.updatedAt });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve document state', details: err.message });
    }
  }

  export async function saveDocumentState(req, res) {
    try {
      const { roomId } = req.params;
      const { data } = req.body;
      const updated = await Document.findOneAndUpdate(
        { roomId },
        { data: Buffer.from(data), updatedAt: new Date() },
        { upsert: true, new: true }
      );
      return res.status(200).json({ success: true, document: updated });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to save document state', details: err.message });
    }
  }
  ```
* **Deliverables Completed:**
  1. **Document Retrieval Endpoint (`getDocumentState`):** Reads serialized binary documents from MongoDB to hydrate editor states when clients enter an existing session.
  2. **Explicit Snapshot Persistence (`saveDocumentState`):** Handles explicit checkpoint saves requested by clients or backup workers.
  3. **Disaster Recovery:** Ensures that even if the Node.js server crashes or restarts, all collaborative code and diagram states are restored from the database.

---

## 3. Week 3 Architecture Flow Diagram

```text
  [ Client Browser A ]                             [ Client Browser B ]
  ┌───────────────────────────────┐                 ┌───────────────────────────────┐
  │ CodeEditor UI (M2)            │                 │ CodeEditor UI (M2)            │
  │     │                         │                 │     │                         │
  │ useMonacoYjs (M3)             │                 │ useMonacoYjs (M3)             │
  │     │                         │                 │     │                         │
  │ MonacoBinding <-> Y.Text      │                 │ MonacoBinding <-> Y.Text      │
  └───────────────┬───────────────┘                 └───────────────▲───────────────┘
                  │                                                 │
                  │ Binary CRDT Diff / editor-update                │
                  ▼                                                 │
      ===================================================================
                       WEBSOCKET PIPELINE (M4)
          ├── editorSync.js / server.js
          ├── Room-isolated broadcast: socket.to(roomId).emit(...)
          └── Language sync: language-change event
      ===================================================================
                  │
                  ▼
      ===================================================================
               DEBOUNCED PERSISTENCE WORKER (M5)
          ├── persistenceWorker.js (scheduleDocumentSave)
          ├── 3000ms Debounce timer (prevents DB bottleneck)
          └── Y.encodeStateAsUpdate(ydoc) -> Buffer.from(stateVector)
      ===================================================================
                  │
                  ▼
      ===================================================================
              DATABASE RECOVERY CONTROLLER (M6)
          ├── documentController.js (getDocumentState / saveDocumentState)
          └── MongoDB Document Collection (stores raw binary buffer)
      ===================================================================
```

---

## 4. Week 3 Summary Contribution Table

| Member | Domain | Key Files & Line References | Week 3 Deliverable |
| :--- | :--- | :--- | :--- |
| **M1** (Lead) | Architecture & Lead | [`architecture.md:L24-L30`](file:///c:/Users/fenil/Downloads/SyncSpace-main/SyncSpace-main/architecture.md#L24-L30) | Week 3 architecture spec, branch reviews, and commit compliance. |
| **M2** | Frontend Editor UI | [`CodeEditor.jsx:L1-L77`](file:///c:/Users/fenil/Downloads/SyncSpace-main/SyncSpace-main/client/src/components/CodeEditor.jsx#L1-L77) | Embedded Monaco Editor pane, 3 languages, theme controls. |
| **M3** | CRDT Editor Binding | [`MonacoYjsBinding.jsx:L1-L27`](file:///c:/Users/fenil/Downloads/SyncSpace-main/SyncSpace-main/client/src/components/MonacoYjsBinding.jsx#L1-L27) | `useMonacoYjs` hook, `MonacoBinding` integration, zero-overwrite typing. |
| **M4** | Socket Pipelines | [`editorSync.js:L1-L9`](file:///c:/Users/fenil/Downloads/SyncSpace-main/SyncSpace-main/server/src/editorSync.js#L1-L9)<br>[`server.js:L82-L84`](file:///c:/Users/fenil/Downloads/SyncSpace-main/SyncSpace-main/server/server.js#L82-L84) | `editor-update`, `code-change`, and `language-change` event channels. |
| **M5** | Debounced Worker | [`persistenceWorker.js:L1-L27`](file:///c:/Users/fenil/Downloads/SyncSpace-main/SyncSpace-main/server/src/persistenceWorker.js#L1-L27) | 3-second debounced state vector serializer saving binary buffers to MongoDB. |
| **M6** | Database Controllers | [`documentController.js:L1-L48`](file:///c:/Users/fenil/Downloads/SyncSpace-main/SyncSpace-main/server/controllers/documentController.js#L1-L48) | State recovery REST controllers (`getDocumentState`, `saveDocumentState`). |
