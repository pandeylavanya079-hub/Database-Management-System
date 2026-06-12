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

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pitambara_dms';

const seedDatabase = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(MONGODB_URI);
    
    // Clear Existing Collections
    console.log('Clearing existing database collections...');
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

    console.log('Creating users...');
    const users = await User.create([
      { name: 'Vandana Mishra', email: 'admin@pitambara.com', password: 'admin123', role: 'Admin', isActive: true },
      { name: 'Manager User', email: 'manager@pitambara.com', password: 'manager123', role: 'Manager', isActive: true },
      { name: 'Staff User', email: 'staff@pitambara.com', password: 'staff123', role: 'Staff', isActive: true }
    ]);
    console.log('Users created successfully!');

    console.log('Creating suppliers...');
    const suppliers = await Supplier.create([
      { name: 'Rajesh Singh', village: 'Gwalior Village', mobileNumber: '9876543210', totalMilkSupplied: 520, totalAmountPayable: 24700, outstandingAmount: 4700 },
      { name: 'Mahendra Yadav', village: 'Dabra', mobileNumber: '9876543211', totalMilkSupplied: 890, totalAmountPayable: 42720, outstandingAmount: 8720 },
      { name: 'Sanjay Sharma', village: 'Chinna', mobileNumber: '9876543212', totalMilkSupplied: 300, totalAmountPayable: 14400, outstandingAmount: 0 },
      { name: 'Devendra Pal', village: 'Datia Road', mobileNumber: '9876543213', totalMilkSupplied: 670, totalAmountPayable: 32160, outstandingAmount: 6160 },
      { name: 'Ramesh Patel', village: 'Morar', mobileNumber: '9876543214', totalMilkSupplied: 400, totalAmountPayable: 19200, outstandingAmount: 5000 }
    ]);
    console.log('Suppliers created!');

    console.log('Creating customers...');
    const customers = await Customer.create([
      { name: 'Gopal Dairy Parlour', mobileNumber: '9123456780', address: 'Hazira, Gwalior', dailyMilkRequirement: 250, customerType: 'Wholesale', outstandingBalance: 12000, lastPaymentDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      { name: 'Krishna Sweets', mobileNumber: '9123456781', address: 'Phalka Bazar, Lashkar', dailyMilkRequirement: 180, customerType: 'Wholesale', outstandingBalance: 8600, lastPaymentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { name: 'Amit Kumar', mobileNumber: '9123456782', address: 'DD Nagar, Gwalior', dailyMilkRequirement: 5, customerType: 'Retail', outstandingBalance: 450, lastPaymentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      { name: 'Suresh Chandra', mobileNumber: '9123456783', address: 'Thatipur, Gwalior', dailyMilkRequirement: 3, customerType: 'Retail', outstandingBalance: 180, lastPaymentDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      { name: 'Ankita Food Court', mobileNumber: '9123456784', address: 'City Centre, Gwalior', dailyMilkRequirement: 120, customerType: 'Wholesale', outstandingBalance: 5800, lastPaymentDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) }
    ]);
    console.log('Customers created!');

    console.log('Creating fleet trucks...');
    const trucks = await Truck.create([
      { truckNumber: 'MP-07-G-1234', capacity: 5000, driverName: 'Sunil Kumar', driverMobile: '9000012345', route: 'Gwalior-Dabra Route' },
      { truckNumber: 'MP-07-G-5678', capacity: 3000, driverName: 'Vijay Yadav', driverMobile: '9000056789', route: 'Gwalior-Datia Route' },
      { truckNumber: 'MP-07-G-9012', capacity: 4000, driverName: 'Satish Pal', driverMobile: '9000090123', route: 'Gwalior-Morar Route' }
    ]);
    console.log('Trucks created!');

    console.log('Generating historic milk transactions...');
    const now = new Date();
    
    // Seed purchases, collections, sales, distributions, payables and receivables for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const transactionDate = new Date();
      transactionDate.setDate(now.getDate() - i);
      transactionDate.setHours(8, 0, 0, 0); // Morning collection

      // Seeding for Suppliers
      for (let j = 0; j < suppliers.length; j++) {
        const supplier = suppliers[j];
        // Skip some days to simulate variable delivery
        if (i % 2 === 0 && j === 2) continue;

        const quantity = Math.floor(Math.random() * 40) + 30; // 30 - 70 Liters
        const fat = Number((Math.random() * 2 + 3.8).toFixed(1)); // 3.8 - 5.8%
        const snf = Number((Math.random() * 1.5 + 8.2).toFixed(1)); // 8.2 - 9.7%
        const rate = Number((fat * 6 + snf * 2.5).toFixed(2)); // rate formula logic simulation
        const totalAmount = Number((quantity * rate).toFixed(2));

        // Create Purchase
        await MilkPurchase.create({
          purchaseDate: transactionDate,
          supplierId: supplier._id,
          supplierName: supplier.name,
          village: supplier.village,
          mobileNumber: supplier.mobileNumber,
          milkType: j % 2 === 0 ? 'Cow' : 'Buffalo',
          quantity,
          fatPercentage: fat,
          snfPercentage: snf,
          ratePerLiter: rate,
          totalAmount,
          paymentStatus: i === 0 ? 'Unpaid' : 'Paid'
        });

        // Create Collection summary
        await DailyMilkCollection.create({
          date: transactionDate,
          supplierId: supplier._id,
          quantity,
          fat,
          snf,
          rate,
          totalAmount
        });

        // Add Payable entry
        await Payable.create({
          supplierId: supplier._id,
          supplierName: supplier.name,
          amountPayable: totalAmount,
          dueDate: new Date(transactionDate.getTime() + 15 * 24 * 60 * 60 * 1000),
          paidAmount: i === 0 ? 0 : totalAmount,
          remainingAmount: i === 0 ? totalAmount : 0,
          status: i === 0 ? 'Unpaid' : 'Paid'
        });
      }

      // Seeding for Customers
      for (let k = 0; k < customers.length; k++) {
        const customer = customers[k];
        // Skip retail customers occasionally
        if (customer.customerType === 'Retail' && i % 3 === 0) continue;

        // Devise sale metrics
        const quantity = customer.customerType === 'Wholesale' 
          ? customer.dailyMilkRequirement + (Math.floor(Math.random() * 20) - 10) // Small variance
          : customer.dailyMilkRequirement;
        
        const rate = customer.customerType === 'Wholesale' ? 55 : 62; // Wholesale vs Retail pricing
        const totalAmount = Number((quantity * rate).toFixed(2));

        // Create Sale
        await MilkSale.create({
          saleDate: transactionDate,
          customerId: customer._id,
          customerName: customer.name,
          quantity,
          fatPercentage: 4.2,
          snfPercentage: 8.8,
          ratePerLiter: rate,
          totalAmount,
          paymentStatus: i === 0 ? 'Unpaid' : 'Paid'
        });

        // Create Daily Distribution
        await DailyMilkDistribution.create({
          date: transactionDate,
          customerId: customer._id,
          quantity,
          rate,
          totalAmount
        });

        // Add Receivable entry
        await Receivable.create({
          customerId: customer._id,
          customerName: customer.name,
          customerMobile: customer.mobileNumber,
          amountDue: totalAmount,
          dueDate: new Date(transactionDate.getTime() + 15 * 24 * 60 * 60 * 1000),
          paidAmount: i === 0 ? 0 : totalAmount,
          remainingAmount: i === 0 ? totalAmount : 0,
          status: i === 0 ? 'Unpaid' : 'Paid'
        });
      }
    }
    console.log('Historic Milk Transactions loaded!');

    console.log('Creating expenses...');
    await Expense.create([
      { date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), expenseType: 'Fuel', amount: 3500, description: 'Diesel for Tanker dispatch' },
      { date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), expenseType: 'Salary', amount: 15000, description: 'Salary for driver Sunil' },
      { date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), expenseType: 'Maintenance', amount: 1200, description: 'Tanker MP-07-G-1234 oil filter replacement' },
      { date: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), expenseType: 'Electricity', amount: 4800, description: 'Dairy chilling unit electricity bill' },
      { date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), expenseType: 'Miscellaneous', amount: 500, description: 'Chai & refreshments for staff' }
    ]);
    console.log('Expenses created!');

    console.log('Creating truck dispatches...');
    await TruckDispatch.create([
      { dispatchDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), truckId: trucks[0]._id, truckNumber: trucks[0].truckNumber, driverName: trucks[0].driverName, route: trucks[0].route, quantityLoaded: 4200, dispatchTime: '06:30 AM', arrivalTime: '11:15 AM' },
      { dispatchDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), truckId: trucks[1]._id, truckNumber: trucks[1].truckNumber, driverName: trucks[1].driverName, route: trucks[1].route, quantityLoaded: 2800, dispatchTime: '07:00 AM', arrivalTime: '10:45 AM' },
      { dispatchDate: new Date(), truckId: trucks[2]._id, truckNumber: trucks[2].truckNumber, driverName: trucks[2].driverName, route: trucks[2].route, quantityLoaded: 3500, dispatchTime: '06:15 AM', arrivalTime: '' }
    ]);
    console.log('Dispatches created!');

    console.log('Creating Payments flow log...');
    // Inflows from Customers
    await Payment.create([
      { date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), type: 'Inflow', customerId: customers[0]._id, amount: 25000, paymentMethod: 'UPI', referenceNumber: 'UPI7394829103' },
      { date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), type: 'Inflow', customerId: customers[1]._id, amount: 15000, paymentMethod: 'Bank Transfer', referenceNumber: 'TXN83948293' },
      // Outflows to Suppliers
      { date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), type: 'Outflow', supplierId: suppliers[0]._id, amount: 20000, paymentMethod: 'UPI', referenceNumber: 'UPI9204859203' },
      { date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), type: 'Outflow', supplierId: suppliers[1]._id, amount: 34000, paymentMethod: 'Bank Transfer', referenceNumber: 'TXN20491024' }
    ]);
    console.log('Payments workflow logged!');

    console.log('--------------------------------------------------');
    console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('You can now log in with the following default users:');
    console.log('1. Admin:   email: admin@pitambara.com   password: admin123');
    console.log('2. Manager: email: manager@pitambara.com password: manager123');
    console.log('3. Staff:   email: staff@pitambara.com   password: staff123');
    console.log('--------------------------------------------------');
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.connection.close();
  }
};

seedDatabase();
