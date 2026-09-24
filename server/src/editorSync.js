export function setupEditorSync(io, socket) {
  socket.on('editor-update', ({ roomId, update }) => {
    socket.to(roomId).emit('editor-update', update);
  });
  socket.on('language-change', ({ roomId, language }) => {
    socket.to(roomId).emit('language-change', { language });
  });
}
