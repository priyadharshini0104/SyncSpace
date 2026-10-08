# SyncSpace — Project Architecture, Map & Review Guide

## 1. Project Overview & Problem Statement
* **Project Name:** SyncSpace
* **Domain:** Real-Time Collaborative Workspace & Distributed Architecture IDE
* **Problem Statement:** Engineering and design teams often struggle to collaborate synchronously on high-level system designs and code logic across disparate tools. Context switching between drawing tools and code editors causes synchronization lag, state drift, and fragmented communication.
* **Solution:** SyncSpace consolidates real-time architectural diagramming, live collaborative code editing, dynamic cursor awareness, and session replay into a single, unified, sub-second latency workspace.

---

## 2. Technical Stack & Architecture Map

### Frontend (Client)
* **Framework:** React.js (Vite)
* **Real-Time Client:** Socket.io-client (Singleton connection pattern)
* **Styling & Layout:** Modular CSS / Tailwind CSS, Dual-Pane Split Layout
* **Canvas Engine:** HTML5 2D Canvas with atomic coordinate delta broadcasting
* **State Management:** Local React state, HTML5 LocalStorage for JWT session tokens

### Backend (Server)
* **Runtime:** Node.js & Express.js
* **WebSocket Engine:** Socket.io server with dynamic room partitioning (`demo-room`)
* **Security & Auth:** JSON Web Tokens (`jsonwebtoken`) + Salted password hashing (`bcryptjs`)
* **Data Layer:** In-memory vector history caches and user registries

### Architecture Diagram Flow
```text
[ Browser Client A (Jones Antony) ]  <---> [ WebSocket Engine (Socket.io) ]  <---> [ Browser Client B (Priyadharshini) ]
                |                                          |                                         |
         HTML5 2D Canvas                            Node.js / Express                         HTML5 2D Canvas
                |                                          |                                         |
     LocalStorage (JWT Token)                Stateless JWT & Bcrypt Auth               LocalStorage (JWT Token)