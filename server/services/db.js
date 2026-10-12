import mongoose from 'mongoose';
import User from '../models/User.js';

let isMongoConnected = false;

// In-Memory store for offline / un-whitelisted MongoDB cluster resilience
const inMemoryUsers = new Map();

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[DB] No MONGODB_URI provided in .env. Running with resilient In-Memory store.');
    return false;
  }

  try {
    console.log('[DB] Attempting connection to MongoDB...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000
    });
    isMongoConnected = true;
    console.log('[DB] MongoDB connected successfully.');
    return true;
  } catch (err) {
    console.warn('[DB] MongoDB connection unavailable (' + err.message + ').');
    console.log('[DB] Gracefully activated Resilient In-Memory User & Session Store.');
    isMongoConnected = false;
    return false;
  }
}

export const userRepository = {
  async findByEmail(email) {
    const normalized = email.toLowerCase().trim();
    if (isMongoConnected) {
      try {
        return await User.findOne({ email: normalized });
      } catch (err) {
        console.error('[DB] Mongo error findByEmail, falling back to memory:', err.message);
      }
    }
    return inMemoryUsers.get(normalized) || null;
  },

  async findById(id) {
    if (isMongoConnected) {
      try {
        return await User.findById(id);
      } catch (err) {
        console.error('[DB] Mongo error findById, falling back to memory:', err.message);
      }
    }
    for (const user of inMemoryUsers.values()) {
      if (user.id === id || user._id === id) return user;
    }
    return null;
  },

  async createUser({ name, email, passwordHash = null, avatar = '', provider = 'local', googleId = null }) {
    const normalized = email.toLowerCase().trim();
    if (isMongoConnected) {
      try {
        const newUser = new User({
          name,
          email: normalized,
          passwordHash,
          avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
          provider,
          googleId,
          lastLogin: new Date()
        });
        await newUser.save();
        return newUser;
      } catch (err) {
        console.error('[DB] Mongo error createUser, falling back to memory:', err.message);
      }
    }

    const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const inMemUser = {
      id,
      _id: id,
      name,
      email: normalized,
      passwordHash,
      avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      provider,
      googleId,
      createdAt: new Date(),
      lastLogin: new Date(),
      toJSON() {
        const copy = { ...this };
        delete copy.passwordHash;
        return copy;
      }
    };
    inMemoryUsers.set(normalized, inMemUser);
    return inMemUser;
  },

  async updateUser(userId, updates) {
    if (isMongoConnected) {
      try {
        const updated = await User.findByIdAndUpdate(userId, updates, { new: true });
        if (updated) return updated;
      } catch (err) {
        console.error('[DB] Mongo error updateUser, falling back to memory:', err.message);
      }
    }

    for (const [key, user] of inMemoryUsers.entries()) {
      if (user.id === userId || user._id === userId) {
        const updatedUser = { ...user, ...updates, updatedAt: new Date() };
        inMemoryUsers.set(key, updatedUser);
        return updatedUser;
      }
    }
    return null;
  },

  getStatus() {
    return {
      isMongoConnected,
      totalInMemoryUsers: inMemoryUsers.size
    };
  }
};
