import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json());

const sessionHistoryStore = new Map();
const roomUsers = new Map();

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'SyncSpace Server is healthy and active' });
});

app.post('/api/sessions/snapshot', (req, res) => {
  const { sessionId, snapshotData, author } = req.body;
  if (!sessionId || !snapshotData) return res.status(400).json({ error: 'Missing fields' });
  if (!sessionHistoryStore.has(sessionId)) sessionHistoryStore.set(sessionId, []);
  
  const snapshotEntry = { id: Date.now(), timestamp: new Date().toISOString(), author: author || 'anonymous', data: snapshotData };
  sessionHistoryStore.get(sessionId).push(snapshotEntry);
  return res.status(201).json({ success: true, snapshot: snapshotEntry });
});

app.get('/api/sessions/:sessionId/history', (req, res) => {
  const { sessionId } = req.params;
  const history = sessionHistoryStore.get(sessionId) || [];
  return res.status(200).json({ sessionId, totalSnapshots: history.length, history });
});

const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

io.on('connection', (socket) => {
  let currentRoom = 'demo-room';

  socket.on('join-room', (roomId) => {
    currentRoom = roomId || 'demo-room';
    socket.join(currentRoom);

    if (!roomUsers.has(currentRoom)) roomUsers.set(currentRoom, new Set());
    roomUsers.get(currentRoom).add(socket.id);

    io.to(currentRoom).emit('room-users', roomUsers.get(currentRoom).size);
  });

  socket.on('canvas-draw', (data) => {
    socket.to(data.room || 'demo-room').emit('canvas-draw', data);
  });

  socket.on('cursor-move', (data) => {
    socket.to(data.room || 'demo-room').emit('cursor-move', {
      socketId: socket.id,
      x: data.x,
      y: data.y,
      user: data.user
    });
  });

  socket.on('code-change', (data) => {
    socket.to(data.room || 'demo-room').emit('code-change', data);
  });

  socket.on('disconnect', () => {
    if (roomUsers.has(currentRoom)) {
      roomUsers.get(currentRoom).delete(socket.id);
      io.to(currentRoom).emit('room-users', roomUsers.get(currentRoom).size);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`SyncSpace Socket & API Server running on port ${PORT}`);
});