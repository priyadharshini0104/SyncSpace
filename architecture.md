# SyncSpace – System Architecture & Design Document

## 1. System Overview
SyncSpace is a real-time collaborative workspace designed to offer synchronous multi-user canvas drawing and concurrent code editing without conflicting overwrites. The system leverages Conflict-Free Replicated Data Types (CRDTs) for optimistic local updates and decentralized consensus.

---

## 2. Technical Stack
* **Frontend**: React.js (Vite), Konva.js (Canvas rendering), Monaco Editor (Code editing)
* **Real-Time Synchronization**: Yjs (CRDT engine), y-websocket / Socket.io
* **Backend**: Node.js, Express.js, WebSockets (ws / socket.io)
* **Database & Persistence**: MongoDB, GridFS / Binary Buffer for Yjs update storage
* **Authentication**: JWT-based room access and user presence management

---

## 3. High-Level Architecture Flow

```text
[Client A (Browser)] <====> [ WebSocket / Yjs Provider ] <====> [ Node.js Server ]
                                      ||                               ||
[Client B (Browser)] <====> [ Awareness Protocol ]                     ||
                                      ||                         [ MongoDB Store ]
                                (Cursor & State)                   (Binary Diffs)