import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from '../models/Customer';
import { connectDB } from '../config/db';

dotenv.config();

const runMigration = async () => {
  console.log('Connecting to database...');
  await connectDB();

  if (mongoose.connection.readyState !== 1) {
    console.error('Failed to connect to MongoDB. Migration aborted.');
    process.exit(1);
  }

  try {
    console.log('Starting migration to initialize customer reminder fields...');
    const result = await Customer.updateMany(
      {
        $or: [
          { lastReminderDate: { $exists: false } },
          { totalRemindersSent: { $exists: false } }
        ]
      },
      {
        $set: {
          lastReminderDate: null,
          totalRemindersSent: 0
        }
      }
    );
    console.log(`Migration completed successfully! Matched ${result.matchedCount} and modified ${result.modifiedCount} customers.`);
    process.exit(0);
  } catch (error: any) {
    console.error(`Migration failed: ${error.message}`);
    process.exit(1);
  }
};

runMigration();
