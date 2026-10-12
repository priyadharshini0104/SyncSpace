import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import { connectDB, userRepository } from './services/db.js';
import { Document, DocumentUpdate } from './models/Document.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SPACES_FILE = path.join(__dirname, 'data', 'spaces.json');

function loadPersistentSpaces() {
  try {
    if (fs.existsSync(SPACES_FILE)) {
      const content = fs.readFileSync(SPACES_FILE, 'utf-8');
      const list = JSON.parse(content);
      if (Array.isArray(list) && list.length > 0) {
        return new Map(list.map(s => [s.id, s]));
      }
    }
  } catch (err) {
    console.warn('[Storage] Error loading spaces.json:', err.message);
  }
  return new Map([
    ['demo-room', { id: 'demo-room', name: 'Demo Room', createdAt: new Date() }]
  ]);
}

function savePersistentSpaces(spacesMap) {
  try {
    const dir = path.dirname(SPACES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const list = Array.from(spacesMap.values());
    fs.writeFileSync(SPACES_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Storage] Error saving spaces.json:', err.message);
  }
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] } });

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json());

// Connect Database (MongoDB with resilient in-memory fallback)
connectDB();

// Mount Authentication APIs
app.use('/api/auth', authRoutes);

// Space Registry & In-Memory Canvas History per room (demo-room only by default)
const roomDrawHistory = new Map();
const knownSpaces = new Set(['demo-room']);

// Real-Time Room Participants Registry: roomId -> Map(socketId -> userData)
const roomParticipants = new Map();

function broadcastRoomAwareness(roomId) {
  const participantsMap = roomParticipants.get(roomId);
  const participantsList = participantsMap ? Array.from(participantsMap.values()) : [];
  io.to(roomId).emit('room-collaborators', participantsList);
  io.to(roomId).emit('room-users', participantsList.length);
}

// System Health & Service Status
app.get('/api/health', (req, res) => {
  const dbStatus = userRepository.getStatus();
  res.json({
    status: 'ok',
    service: 'SyncSpace Server, JWT & Google Auth Active',
    googleAuthEnabled: Boolean(process.env.GOOGLE_CLIENT_ID),
    database: dbStatus.isMongoConnected ? 'MongoDB Atlas' : 'Resilient In-Memory Store'
  });
});

// Space Registry (loaded with file persistence)
const registeredSpaces = loadPersistentSpaces();

// List all spaces
app.get('/api/spaces', (req, res) => {
  return res.json({ success: true, spaces: Array.from(registeredSpaces.values()) });
});

// Clear all custom spaces created across all Gmail accounts and users
app.post('/api/spaces/clear-all', async (req, res) => {
  registeredSpaces.clear();
  registeredSpaces.set('demo-room', { id: 'demo-room', name: 'Demo Room', createdAt: new Date() });
  savePersistentSpaces(registeredSpaces);
  roomDrawHistory.clear();
  knownSpaces.clear();
  knownSpaces.add('demo-room');
  roomParticipants.clear();

  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      await Document.deleteMany({ docId: { $ne: 'demo-room' } }).catch(() => {});
      await DocumentUpdate.deleteMany({ docId: { $ne: 'demo-room' } }).catch(() => {});
    }
  } catch (e) {
    // resilient in-memory fallback
  }

  // Notify all connected clients
  io.emit('all-spaces-cleared');

  return res.json({
    success: true,
    message: 'All custom spaces created till now have been cleared from all Gmail accounts.',
    spaces: Array.from(registeredSpaces.values())
  });
});

// Alias DELETE /api/spaces to clear all custom spaces
app.delete('/api/spaces', async (req, res) => {
  registeredSpaces.clear();
  registeredSpaces.set('demo-room', { id: 'demo-room', name: 'Demo Room', createdAt: new Date() });
  savePersistentSpaces(registeredSpaces);
  roomDrawHistory.clear();
  knownSpaces.clear();
  knownSpaces.add('demo-room');
  roomParticipants.clear();
  io.emit('all-spaces-cleared');
  return res.json({ success: true, message: 'All custom spaces have been cleared.' });
});

// Verify if a space exists before joining
app.get('/api/spaces/verify/:spaceId', (req, res) => {
  const cleanId = (req.params.spaceId || '').trim().toLowerCase();
  const space = registeredSpaces.get(cleanId);
  if (!space) {
    return res.status(200).json({
      exists: false,
      error: `Space "${cleanId}" has not been created yet.`
    });
  }
  return res.json({ success: true, exists: true, space });
});

// Explicit Space Creation API
app.post('/api/spaces/create', (req, res) => {
  const { id, name, createdBy } = req.body;
  if (!id || !id.trim()) {
    return res.status(400).json({ error: 'Space ID is required.' });
  }
  const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  if (registeredSpaces.has(cleanId)) {
    return res.status(409).json({
      error: `Space "${cleanId}" already exists. Please choose another ID or join it.`
    });
  }
  const newSpace = {
    id: cleanId,
    name: (name && name.trim()) || cleanId,
    createdBy: (createdBy || 'Anonymous').trim(),
    createdAt: new Date()
  };
  registeredSpaces.set(cleanId, newSpace);
  savePersistentSpaces(registeredSpaces);
  return res.status(201).json({ success: true, space: newSpace });
});

// Fetch spaces created by a specific user
app.get('/api/spaces/user/:userEmail', (req, res) => {
  const query = (req.params.userEmail || '').trim().toLowerCase();
  const userSpaces = Array.from(registeredSpaces.values()).filter(s => {
    if (!s.createdBy) return false;
    const creator = s.createdBy.toLowerCase().trim();
    return creator === query || creator.includes(query) || query.includes(creator);
  });
  return res.json({ success: true, spaces: userSpaces });
});

// Delete a space and notify active sockets
app.delete('/api/spaces/:spaceId', (req, res) => {
  const cleanId = (req.params.spaceId || '').trim().toLowerCase();
  if (!cleanId) {
    return res.status(400).json({ error: 'Space ID is required.' });
  }
  if (cleanId === 'demo-room') {
    return res.status(400).json({ error: 'Cannot delete the default demo-room space.' });
  }
  if (!registeredSpaces.has(cleanId)) {
    return res.status(404).json({ error: `Space "${cleanId}" not found.` });
  }

  const space = registeredSpaces.get(cleanId);
  const requestedBy = (req.body?.userEmail || req.query?.userEmail || '').trim().toLowerCase();
  if (requestedBy && space.createdBy && space.createdBy.toLowerCase() !== 'anonymous' && space.createdBy.toLowerCase() !== requestedBy) {
    return res.status(403).json({ error: 'You do not have permission to delete this space.' });
  }

  // Remove space and clean up draw history
  registeredSpaces.delete(cleanId);
  savePersistentSpaces(registeredSpaces);
  roomDrawHistory.delete(cleanId);
  knownSpaces.delete(cleanId);
  roomParticipants.delete(cleanId);

  // Notify any active clients inside the room
  io.to(cleanId).emit('space-deleted', { spaceId: cleanId });

  return res.json({ success: true, message: `Space "${cleanId}" was deleted successfully.` });
});

// --- WEBSOCKET SYNC & MULTI-USER AWARENESS ---
io.on('connection', (socket) => {
  socket.on('join-room', (payload) => {
    let targetRoom = 'demo-room';
    let userInfo = {
      name: 'Collaborator',
      email: '',
      avatar: '',
      color: '#000000'
    };

    if (typeof payload === 'string') {
      targetRoom = (payload || 'demo-room').trim();
    } else if (payload && typeof payload === 'object') {
      targetRoom = (payload.roomId || 'demo-room').trim();
      if (payload.user) {
        userInfo = {
          name: payload.user.name || payload.user.displayName || 'Collaborator',
          email: payload.user.email || '',
          avatar: payload.user.avatar || '',
          color: payload.color || payload.user.color || '#000000'
        };
      }
    }

    // Leave any previous room if different
    if (socket.currentRoom && socket.currentRoom !== targetRoom) {
      const oldRoom = socket.currentRoom;
      socket.leave(oldRoom);
      if (roomParticipants.has(oldRoom)) {
        roomParticipants.get(oldRoom).delete(socket.id);
        broadcastRoomAwareness(oldRoom);
      }
      io.to(oldRoom).emit('user-left', socket.id);
    }

    socket.currentRoom = targetRoom;
    socket.userData = {
      id: socket.id,
      socketId: socket.id,
      ...userInfo,
      joinedAt: new Date().toISOString()
    };

    socket.join(targetRoom);
    knownSpaces.add(targetRoom);

    if (!roomParticipants.has(targetRoom)) {
      roomParticipants.set(targetRoom, new Map());
    }
    roomParticipants.get(targetRoom).set(socket.id, socket.userData);

    if (!roomDrawHistory.has(targetRoom)) roomDrawHistory.set(targetRoom, []);
    socket.emit('initial-canvas-state', roomDrawHistory.get(targetRoom));

    broadcastRoomAwareness(targetRoom);
  });

  socket.on('leave-room', (roomId) => {
    const targetRoom = roomId || socket.currentRoom;
    if (targetRoom) {
      socket.leave(targetRoom);
      if (roomParticipants.has(targetRoom)) {
        roomParticipants.get(targetRoom).delete(socket.id);
        broadcastRoomAwareness(targetRoom);
      }
      io.to(targetRoom).emit('user-left', socket.id);
      socket.currentRoom = null;
    }
  });

  socket.on('canvas-draw', (data) => {
    const room = data.room || socket.currentRoom || 'demo-room';
    if (!roomDrawHistory.has(room)) roomDrawHistory.set(room, []);
    if (data.type === 'clear') {
      roomDrawHistory.set(room, []);
    } else if (data.type === 'move' || data.type === 'update-all' || data.type === 'undo' || data.type === 'redo') {
      if (Array.isArray(data.history)) {
        roomDrawHistory.set(room, data.history);
      } else if (data.shape && data.shape.id) {
        const history = roomDrawHistory.get(room);
        const idx = history.findIndex(item => item.id === data.shape.id);
        if (idx !== -1) history[idx] = data.shape;
      }
    } else if (data.type === 'delete-shape') {
      if (data.id) {
        const history = roomDrawHistory.get(room);
        roomDrawHistory.set(room, history.filter(item => item.id !== data.id));
      }
    } else {
      roomDrawHistory.get(room).push(data);
    }
    socket.to(room).emit('canvas-draw', data);
  });

  socket.on('cursor-move', (data) => {
    const room = data.room || socket.currentRoom || 'demo-room';
    if (socket.userData) {
      if (data.user) socket.userData.name = data.user;
      if (data.avatar) socket.userData.avatar = data.avatar;
      if (data.color) socket.userData.color = data.color;
      if (roomParticipants.has(room)) {
        roomParticipants.get(room).set(socket.id, {
          ...socket.userData,
          lastActive: Date.now()
        });
      }
    }
    socket.to(room).emit('cursor-move', {
      socketId: socket.id,
      x: data.x,
      y: data.y,
      user: data.user,
      color: data.color,
      avatar: data.avatar || ''
    });
  });

  socket.on('code-change', (data) => {
    const room = (typeof data === 'object' && data.room) ? data.room : (socket.currentRoom || 'demo-room');
    socket.to(room).emit('code-change', data);
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        if (roomParticipants.has(room)) {
          roomParticipants.get(room).delete(socket.id);
          broadcastRoomAwareness(room);
        } else {
          const clients = io.sockets.adapter.rooms.get(room);
          const count = clients ? clients.size - 1 : 0;
          io.to(room).emit('room-users', Math.max(0, count));
        }
        io.to(room).emit('user-left', socket.id);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`SyncSpace Server running on port ${PORT}`);
  console.log(`Google Sign-In integration: ${process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Ready (Client ID optional for demo/sandbox)'}`);
});