import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';

// Import Routes
import authRoutes from './routes/authRoutes';
import supplierRoutes from './routes/supplierRoutes';
import customerRoutes from './routes/customerRoutes';
import purchaseRoutes from './routes/purchaseRoutes';
import salesRoutes from './routes/salesRoutes';
import receivableRoutes from './routes/receivableRoutes';
import payableRoutes from './routes/payableRoutes';
import truckRoutes from './routes/truckRoutes';
import dispatchRoutes from './routes/dispatchRoutes';
import expenseRoutes from './routes/expenseRoutes';
import reportRoutes from './routes/reportRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import billRoutes from './routes/billRoutes';
import { mockDbMiddleware } from './middleware/mockDb';

// Load environmental config
dotenv.config();

// Connect Mongoose to MongoDB
connectDB();

const app = express();

// Standard middlewares
app.use(cors());
app.use(express.json());

// Fallback mock DB handler for offline MongoDB testing
app.use(mockDbMiddleware);

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/receivables', receivableRoutes);
app.use('/api/payables', payableRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/dispatches', dispatchRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/bills', billRoutes);

import mongoose from 'mongoose';
import { MONGODB_URI, lastConnectionError } from './config/db';

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'OFFLINE',
    readyState: mongoose.connection.readyState,
    mongodbUri: MONGODB_URI ? MONGODB_URI.replace(/:([^@]+)@/, ':****@') : null, // Mask password
    lastError: lastConnectionError
  });
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ message: `API endpoint '${req.originalUrl}' not found` });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`App Error: ${err.message}`);
  res.status(500).json({
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

import { initScheduler } from './utils/scheduler';

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    initScheduler();
  });
} else {
  // Initialize scheduler in serverless mode
  initScheduler();
}

export default app;
