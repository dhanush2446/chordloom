import mongoose from 'mongoose';
import app from '../server/index.js';

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }
  
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in Vercel environment variables. Please add it to your Vercel project settings.');
  }
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('✅ Connected to MongoDB in Serverless Function');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
  }
};

export default async function handler(req, res) {
  try {
    // Ensure DB is connected before handling the request
    await connectDB();
    
    // Forward the request and response to the Express app
    return app(req, res);
  } catch (error) {
    console.error('Vercel Handler Error:', error);
    return res.status(500).json({ error: 'Serverless Function Error', details: error.message });
  }
}
