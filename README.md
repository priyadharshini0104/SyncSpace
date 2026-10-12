# SyncSpace: Real-Time Collaborative Whiteboard & Code Editor
SyncSpace is an advanced MERN stack engineering platform featuring low-latency dual-pane collaboration with an interactive canvas and synchronized code editor.
## Key Architectural Modules
- **Dual-Pane Collaborative Layout**: Whiteboard on the left, Monaco Code Editor on the right.
- **Real-Time Sync Engine**: Socket.io room orchestration and multi-user cursor tracking.
- **CRDT Mathematics**: Yjs integration for concurrent document state synchronization and conflict-free merging.
- **Interactive Whiteboard**: High-performance 2D drawing powered by Konva.js.
- **Persistence Worker**: Automated binary state serialization and recovery via MongoDB.
## Tech Stack
- **Frontend**: React, Konva.js, Monaco Editor, Yjs (y-monaco), Vite
- **Backend**: Node.js, Express, Socket.io, Yjs Server Engine
- **Database**: MongoDB (CRDT State Vectors & Binary Document Store)
## Project Roadmap
- [x] Week 1: Socket Infrastructure & React Split-Screen Layout
- [x] Week 2: Konva.js Canvas & Multi-User Cursor Awareness
- [x] Week 3: Monaco Editor Binding & MongoDB Binary Persistence
- [x] Week 4: Session Replay Timeline Slider, JWT Access Control & Google OAuth 2.0 Integration

## Authentication & Sign in with Google

SyncSpace supports both **Google Sign-In (OAuth 2.0 / GIS)** and **Stateless JWT Email/Password Authentication** with salted bcrypt hashing.

### Configuration
1. **Server (`server/.env`)**:
   ```env
   PORT=5000
   JWT_SECRET=syncspace_jwt_secret_2026_super_secure_key
   MONGODB_URI=mongodb+srv://...
   # Optional: Set your Google OAuth 2.0 Client ID
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   ```
2. **Client (`client/.env`)**:
   ```env
   VITE_API_URL=http://localhost:5000
   VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   ```

### Running Automated Auth Tests
```bash
cd server
npm test
```

