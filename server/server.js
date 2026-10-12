import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import { connectDB, userRepository } from './services/db.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json());

// Connect Database (MongoDB with resilient in-memory fallback)
connectDB();

// Mount Authentication APIs
app.use('/api/auth', authRoutes);

// Space Registry & In-Memory Canvas History per room
const roomDrawHistory = new Map();
const knownSpaces = new Set(['demo-room', 'architecture-lab', 'system-design']);

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

// Space Registry
const registeredSpaces = new Map([
  ['demo-room', { id: 'demo-room', name: 'Demo Room', createdAt: new Date() }]
]);

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
  return res.status(201).json({ success: true, space: newSpace });
});

// Fetch spaces created by a specific user
app.get('/api/spaces/user/:userEmail', (req, res) => {
  const email = (req.params.userEmail || '').trim().toLowerCase();
  const userSpaces = Array.from(registeredSpaces.values()).filter(
    s => s.createdBy && s.createdBy.toLowerCase() === email
  );
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
  roomDrawHistory.delete(cleanId);
  knownSpaces.delete(cleanId);

  // Notify any active clients inside the room
  io.to(cleanId).emit('space-deleted', { spaceId: cleanId });

  return res.json({ success: true, message: `Space "${cleanId}" was deleted successfully.` });
});

// --- WEBSOCKET SYNC & MULTI-USER AWARENESS ---
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    const targetRoom = (roomId || 'demo-room').trim();

    // Leave any previous room if different
    if (socket.currentRoom && socket.currentRoom !== targetRoom) {
      socket.leave(socket.currentRoom);
      const oldClients = io.sockets.adapter.rooms.get(socket.currentRoom);
      io.to(socket.currentRoom).emit('room-users', oldClients ? oldClients.size : 0);
      io.to(socket.currentRoom).emit('user-left', socket.id);
    }

    socket.currentRoom = targetRoom;
    socket.join(targetRoom);
    knownSpaces.add(targetRoom);

    if (!roomDrawHistory.has(targetRoom)) roomDrawHistory.set(targetRoom, []);
    socket.emit('initial-canvas-state', roomDrawHistory.get(targetRoom));

    const clients = io.sockets.adapter.rooms.get(targetRoom);
    io.to(targetRoom).emit('room-users', clients ? clients.size : 1);
  });

  socket.on('leave-room', (roomId) => {
    const targetRoom = roomId || socket.currentRoom;
    if (targetRoom) {
      socket.leave(targetRoom);
      const clients = io.sockets.adapter.rooms.get(targetRoom);
      io.to(targetRoom).emit('room-users', clients ? clients.size : 0);
      io.to(targetRoom).emit('user-left', socket.id);
      socket.currentRoom = null;
    }
  });

  socket.on('canvas-draw', (data) => {
    const room = data.room || socket.currentRoom || 'demo-room';
    if (!roomDrawHistory.has(room)) roomDrawHistory.set(room, []);
    if (data.type === 'clear') roomDrawHistory.set(room, []);
    else roomDrawHistory.get(room).push(data);
    socket.to(room).emit('canvas-draw', data);
  });

  socket.on('cursor-move', (data) => {
    const room = data.room || socket.currentRoom || 'demo-room';
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
        const clients = io.sockets.adapter.rooms.get(room);
        const count = clients ? clients.size - 1 : 0;
        io.to(room).emit('room-users', Math.max(0, count));
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