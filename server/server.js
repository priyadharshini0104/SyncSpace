import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const server = http.createServer(app);
const JWT_SECRET = 'syncspace_jwt_secret_2026';

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json());

// In-Memory User Database & Canvas History
const usersDB = new Map();
const roomDrawHistory = new Map();

// --- WEEK 1: JWT AUTHENTICATION APIS ---
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (usersDB.has(email)) return res.status(400).json({ error: 'Email already exists' });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  usersDB.set(email, { name, passwordHash });

  const token = jwt.sign({ email, name }, JWT_SECRET, { expiresIn: '24h' });
  return res.status(201).json({ success: true, token, user: { name, email } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = usersDB.get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  return res.status(200).json({ success: true, token, user: { name: user.name, email } });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'SyncSpace Server & JWT Auth Active' }));

// --- WEEK 2: WEBSOCKET SYNC & AWARENESS ---
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

io.on('connection', (socket) => {
  let currentRoom = 'demo-room';

  socket.on('join-room', (roomId) => {
    currentRoom = roomId || 'demo-room';
    socket.join(currentRoom);

    if (!roomDrawHistory.has(currentRoom)) roomDrawHistory.set(currentRoom, []);
    socket.emit('initial-canvas-state', roomDrawHistory.get(currentRoom));

    const clients = io.sockets.adapter.rooms.get(currentRoom);
    io.to(currentRoom).emit('room-users', clients ? clients.size : 1);
  });

  socket.on('canvas-draw', (data) => {
    const room = data.room || 'demo-room';
    if (!roomDrawHistory.has(room)) roomDrawHistory.set(room, []);
    if (data.type === 'clear') roomDrawHistory.set(room, []);
    else roomDrawHistory.get(room).push(data);
    socket.to(room).emit('canvas-draw', data);
  });

  socket.on('cursor-move', (data) => {
    socket.to(data.room || 'demo-room').emit('cursor-move', {
      socketId: socket.id,
      x: data.x,
      y: data.y,
      user: data.user,
      color: data.color
    });
  });

  socket.on('code-change', (data) => {
    socket.to(data.room || 'demo-room').emit('code-change', data);
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        const clients = io.sockets.adapter.rooms.get(room);
        const count = clients ? clients.size - 1 : 0;
        io.to(room).emit('room-users', Math.max(1, count));
        io.to(room).emit('user-left', socket.id);
      }
    }
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`SyncSpace Server running on port ${PORT}`));