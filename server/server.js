import cors from "cors";
import "dotenv/config";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import * as Y from "yjs";

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const documents = new Map();

function getDocument(roomId) {
  if (!documents.has(roomId)) {
    documents.set(roomId, new Y.Doc());
  }
  return documents.get(roomId);
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SyncSpace Server Running"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "SyncSpace API Working"
  });
});

io.on("connection", (socket) => {

  console.log("🟢 Socket connected:", socket.id);

  socket.on("join-room", ({ roomId, username, userName }) => {

    const finalUsername = username || userName;

    if (!roomId || !finalUsername) {
      console.log("❌ Room ID or username missing");
      return;
    }

    socket.join(roomId);

    socket.data.roomId = roomId;
    socket.data.username = finalUsername;

    console.log("================================");
    console.log("👤 USER JOINED");
    console.log("Name:", finalUsername);
    console.log("Room:", roomId);
    console.log("Socket:", socket.id);
    console.log("================================");

    socket.emit("room-joined", {
      roomId,
      username: finalUsername
    });

    io.in(roomId).fetchSockets().then((sockets) => {

      const users = sockets.map((s) => ({
        id: s.id,
        name: s.data.username
      }));

      io.in(roomId).emit("users-update", users);
    });

    const doc = getDocument(roomId);
    const update = Y.encodeStateAsUpdate(doc);

    socket.emit(
      "yjs-sync",
      uint8ToBase64(update)
    );
  });

  socket.on("yjs-update", ({ roomId, update }) => {

    if (!roomId || !update) return;

    try {

      const doc = getDocument(roomId);
      const binaryUpdate = base64ToUint8(update);

      Y.applyUpdate(doc, binaryUpdate);

      socket.to(roomId).emit(
        "yjs-update",
        update
      );

    } catch (error) {
      console.error("❌ YJS update error:", error.message);
    }
  });

  socket.on("awareness-update", ({ roomId, awareness }) => {

    if (!roomId || !awareness) return;

    socket.to(roomId).emit(
      "awareness-update",
      {
        id: socket.id,
        ...awareness
      }
    );
  });

  socket.on("disconnect", async () => {

    const roomId = socket.data.roomId;

    console.log("🔴 Socket disconnected:", socket.id);

    if (!roomId) return;

    socket.to(roomId).emit(
      "awareness-remove",
      socket.id
    );

    try {

      const sockets = await io.in(roomId).fetchSockets();

      const users = sockets.map((s) => ({
        id: s.id,
        name: s.data.username
      }));

      io.in(roomId).emit("users-update", users);

    } catch (error) {
      console.error("Users update error:", error.message);
    }
  });
});

async function connectMongoDB() {

  if (!process.env.MONGO_URI) {
    console.log("⚠️ MONGO_URI not found");
    console.log("Running without MongoDB");
    return;
  }

  try {

    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB connected");

  } catch (error) {

    console.log(
      "❌ MongoDB connection failed:",
      error.message
    );
  }
}

async function startServer() {

  await connectMongoDB();

  server.listen(PORT, () => {

    console.log("====================================");
    console.log("🚀 SyncSpace Server Running");
    console.log("====================================");
    console.log(`🌐 http://localhost:${PORT}`);
    console.log("====================================");

  });
}

startServer();

function uint8ToBase64(bytes) {

  let binary = "";
  const chunkSize = 0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {

    binary += String.fromCharCode(
      ...bytes.subarray(i, i + chunkSize)
    );
  }

  return Buffer
    .from(binary, "binary")
    .toString("base64");
}

function base64ToUint8(base64) {

  return new Uint8Array(
    Buffer.from(base64, "base64")
  );
}