import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json());

// In-Memory store to remember canvas strokes for new tabs
const roomDrawHistory = new Map();

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'SyncSpace Server Active' });
});

const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

io.on('connection', (socket) => {
  let userRoom = 'demo-room';

  socket.on('join-room', (roomId) => {
    userRoom = roomId || 'demo-room';
    socket.join(userRoom);

    // 1. Send all existing drawing history to the newly joined tab
    if (!roomDrawHistory.has(userRoom)) {
      roomDrawHistory.set(userRoom, []);
    }
    socket.emit('initial-canvas-state', roomDrawHistory.get(userRoom));

    // 2. Broadcast accurate room users count
    const clients = io.sockets.adapter.rooms.get(userRoom);
    io.to(userRoom).emit('room-users', clients ? clients.size : 1);
  });

  socket.on('canvas-draw', (data) => {
    const room = data.room || 'demo-room';
    if (!roomDrawHistory.has(room)) roomDrawHistory.set(room, []);

    if (data.type === 'clear') {
      roomDrawHistory.set(room, []);
    } else {
      roomDrawHistory.get(room).push(data);
    }

    socket.to(room).emit('canvas-draw', data);
  });

  socket.on('cursor-move', (data) => {
    const room = data.room || 'demo-room';
    socket.to(room).emit('cursor-move', {
      socketId: socket.id,
      x: data.x,
      y: data.y,
      user: data.user || 'Collaborator'
    });
  });

  socket.on('code-change', (data) => {
    const room = data.room || 'demo-room';
    socket.to(room).emit('code-change', data);
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`SyncSpace Server running on port ${PORT}`);
});