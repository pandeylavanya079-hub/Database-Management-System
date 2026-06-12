import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User';
import Supplier from './models/Supplier';
import Customer from './models/Customer';
import MilkPurchase from './models/MilkPurchase';
import MilkSale from './models/MilkSale';
import Payable from './models/Payable';
import Receivable from './models/Receivable';
import Payment from './models/Payment';
import Expense from './models/Expense';
import Truck from './models/Truck';
import TruckDispatch from './models/TruckDispatch';
import DailyMilkCollection from './models/DailyMilkCollection';
import DailyMilkDistribution from './models/DailyMilkDistribution';
import Bill from './models/Bill';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pitambara_dms';

const clearDatabase = async () => {
  try {
    console.log('Connecting to database to clear dummy data...');
    await mongoose.connect(MONGODB_URI);
    
    console.log('Clearing database collections...');
    await User.deleteMany({});
    await Supplier.deleteMany({});
    await Customer.deleteMany({});
    await MilkPurchase.deleteMany({});
    await MilkSale.deleteMany({});
    await Payable.deleteMany({});
    await Receivable.deleteMany({});
    await Payment.deleteMany({});
    await Expense.deleteMany({});
    await Truck.deleteMany({});
    await TruckDispatch.deleteMany({});
    await DailyMilkCollection.deleteMany({});
    await DailyMilkDistribution.deleteMany({});
    await Bill.deleteMany({});

    console.log('Re-creating clean default user credentials...');
    // The passwords will be hashed correctly via the User schema's pre-save middleware
    await User.create([
      { name: 'Vandana Mishra', email: 'admin@pitambara.com', password: 'admin123', role: 'Admin', isActive: true },
      { name: 'Manager User', email: 'manager@pitambara.com', password: 'manager123', role: 'Manager', isActive: true },
      { name: 'Staff User', email: 'staff@pitambara.com', password: 'staff123', role: 'Staff', isActive: true }
    ]);

    console.log('--------------------------------------------------');
    console.log('DATABASE RESET COMPLETED SUCCESSFULLY!');
    console.log('All dummy logs, transactions, and ledgers have been removed.');
    console.log('You can now log in with the clean default accounts:');
    console.log('1. Admin:   email: admin@pitambara.com   password: admin123');
    console.log('2. Manager: email: manager@pitambara.com password: manager123');
    console.log('3. Staff:   email: staff@pitambara.com   password: staff123');
    console.log('--------------------------------------------------');
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

clearDatabase();
