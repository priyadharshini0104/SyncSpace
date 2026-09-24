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
        { 
          data: binaryBuffer, 
          updatedAt: new Date() 
        },
        { upsert: true, new: true }
      );
      saveTimers.delete(roomId);
    } catch (err) {
      console.error('Error auto-persisting Yjs state:', err);
    }
  }, delayMs);
  saveTimers.set(roomId, timer);
}
