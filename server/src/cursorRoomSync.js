const rooms = new Map();
function registerCursorAndRoomHandlers(io, socket) {
  socket.on('join-room', ({ roomId, user }) => {
    socket.join(roomId);
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    const roomUsers = rooms.get(roomId);
    roomUsers.set(socket.id, {
      userId: user?.id || socket.id,
      username: user?.name || 'Anonymous',
      cursor: { x: 0, y: 0 }
    });
    io.to(roomId).emit('room-users-updated', Array.from(roomUsers.values()));
  });
  socket.on('cursor-move', ({ roomId, position }) => {
    const roomUsers = rooms.get(roomId);
    if (roomUsers && roomUsers.has(socket.id)) {
      const user = roomUsers.get(socket.id);
      user.cursor = position;
      socket.to(roomId).emit('cursor-update', {
        userId: user.userId,
        cursor: position
      });
    }
  });
  socket.on('disconnecting', () => {
    socket.rooms.forEach((roomId) => {
      const roomUsers = rooms.get(roomId);
      if (roomUsers) {
        roomUsers.delete(socket.id);
        if (roomUsers.size === 0) {
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit('room-users-updated', Array.from(roomUsers.values()));
        }
      }
    });
  });
}
module.exports = { registerCursorAndRoomHandlers };
