import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from '../server/routes/auth.js';
import recordingRoutes from '../server/routes/recordings.js';

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '16mb' }));
app.use(express.urlencoded({ limit: '16mb', extended: true }));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/recordings', recordingRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── MongoDB Connection (cached for serverless) ───────────────
let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in environment variables');
  }

  // Reuse existing connection if mongoose is already connected
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  await mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
  });
  isConnected = true;
  console.log('✅ Connected to MongoDB Atlas (serverless)');
}

// ── Serverless Handler ───────────────────────────────────────
export default async function handler(req, res) {
  await connectDB();
  return app(req, res);
}
