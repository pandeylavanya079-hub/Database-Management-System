import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pitambara_dms';

export const connectDB = async (): Promise<void> => {
  const mongooseOptions = {
    autoIndex: true, // Build indexes automatically in development/production
    serverSelectionTimeoutMS: 10000, // Timeout after 10s if database is down
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    maxPoolSize: 15, // Increase connection pool size for multi-user access
    minPoolSize: 2, // Maintain at least 2 open connections
  };

  try {
    const conn = await mongoose.connect(MONGODB_URI, mongooseOptions);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Listen for unexpected connection drops
    mongoose.connection.on('disconnected', () => {
      console.warn('WARNING: MongoDB connection lost! Attempting automatic reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB connection successfully restored!');
    });
  } catch (error) {
    console.warn(`WARNING: Could not connect to MongoDB at ${MONGODB_URI}. Operations requiring database access will fail, but the API server is kept running in-memory fallback mode.`);
  }
};
