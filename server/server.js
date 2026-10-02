import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

// CORS and JSON Configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json());

// In-Memory Storage for Snapshots & History (Member 6)
const sessionHistoryStore = new Map();

// REST Health Check & Root API
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'SyncSpace Server is healthy and active' });
});

// Session History Persistence Endpoints
app.post('/api/sessions/snapshot', (req, res) => {
  const { sessionId, snapshotData, author } = req.body;
  if (!sessionId || !snapshotData) {
    return res.status(400).json({ error: 'sessionId and snapshotData are required' });
  }

  if (!sessionHistoryStore.has(sessionId)) {
    sessionHistoryStore.set(sessionId, []);
  }

  const snapshotEntry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    author: author || 'anonymous',
    data: snapshotData
  };

  sessionHistoryStore.get(sessionId).push(snapshotEntry);
  return res.status(201).json({ success: true, snapshot: snapshotEntry });
});

app.get('/api/sessions/:sessionId/history', (req, res) => {
  const { sessionId } = req.params;
  const history = sessionHistoryStore.get(sessionId) || [];
  return res.status(200).json({ sessionId, totalSnapshots: history.length, history });
});

// Socket.io Real-Time Synchronization Engine
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket Connected]: ${socket.id}`);

  // Room Join
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room: ${roomId}`);
    socket.to(roomId).emit('user-joined', { socketId: socket.id });
  });

  // Real-Time Canvas Drawing Broadcasting (Lines, Shapes, Eraser, Clear)
  socket.on('canvas-draw', (data) => {
    const room = data.room || 'demo-room';
    socket.to(room).emit('canvas-draw', data);
  });

  // Real-Time Multi-User Cursor & Awareness Sync
  socket.on('cursor-move', (data) => {
    const room = data.room || 'demo-room';
    socket.to(room).emit('cursor-move', {
      socketId: socket.id,
      x: data.x,
      y: data.y,
      user: data.user
    });
  });

  // Monaco Code Delta Sync
  socket.on('code-change', (data) => {
    const room = data.room || 'demo-room';
    socket.to(room).emit('code-change', data);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected]: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`SyncSpace Socket & API Server running on port ${PORT}`);
});