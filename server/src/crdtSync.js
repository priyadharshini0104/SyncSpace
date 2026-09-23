const Y = require('yjs');
const { WebsocketProvider } = require('y-websocket');

class CrdtSyncManager {
  constructor() {
    this.docs = new Map();
  }

  getDoc(roomName) {
    if (!this.docs.has(roomName)) {
      const doc = new Y.Doc();
      this.docs.set(roomName, doc);
    }
    return this.docs.get(roomName);
  }

  handleAwarenessUpdate(roomName, clientId, state) {
    const doc = this.getDoc(roomName);
    const awarenessMap = doc.getMap('awareness');
    awarenessMap.set(String(clientId), {
      ...state,
      updatedAt: Date.now()
    });
    return awarenessMap.toJSON();
  }

  handleCoordinateSync(roomName, update) {
    const doc = this.getDoc(roomName);
    Y.applyUpdate(doc, update);
    return Y.encodeStateAsUpdate(doc);
  }
}

module.exports = new CrdtSyncManager();
