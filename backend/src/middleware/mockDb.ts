import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// In-memory data store replicating seeded collections
const mockUsers = [
  { _id: 'u1', name: 'Vandana Mishra', email: 'admin@pitambara.com', role: 'Admin', passwordHash: '$2a$10$xyz...', isActive: true },
  { _id: 'u2', name: 'Manager User', email: 'manager@pitambara.com', role: 'Manager', passwordHash: '$2a$10$xyz...', isActive: true },
  { _id: 'u3', name: 'Staff User', email: 'staff@pitambara.com', role: 'Staff', passwordHash: '$2a$10$xyz...', isActive: true }
];

let mockSuppliers = [
  { _id: 's1', name: 'Rajesh Singh', village: 'Gwalior Village', mobileNumber: '9876543210', totalMilkSupplied: 520, totalAmountPayable: 24700, outstandingAmount: 4700 },
  { _id: 's2', name: 'Mahendra Yadav', village: 'Dabra', mobileNumber: '9876543211', totalMilkSupplied: 890, totalAmountPayable: 42720, outstandingAmount: 8720 },
  { _id: 's3', name: 'Sanjay Sharma', village: 'Chinna', mobileNumber: '9876543212', totalMilkSupplied: 300, totalAmountPayable: 14400, outstandingAmount: 0 },
  { _id: 's4', name: 'Devendra Pal', village: 'Datia Road', mobileNumber: '9876543213', totalMilkSupplied: 670, totalAmountPayable: 32160, outstandingAmount: 6160 },
  { _id: 's5', name: 'Ramesh Patel', village: 'Morar', mobileNumber: '9876543214', totalMilkSupplied: 400, totalAmountPayable: 19200, outstandingAmount: 5000 }
];

let mockCustomers: any[] = [
  { _id: 'c1', name: 'Gopal Dairy Parlour', mobileNumber: '9123456780', address: 'Hazira, Gwalior', dailyMilkRequirement: 250, customerType: 'Wholesale', outstandingBalance: 12000, lastPaymentDate: new Date().toISOString() },
  { _id: 'c2', name: 'Krishna Sweets', mobileNumber: '9123456781', address: 'Phalka Bazar, Lashkar', dailyMilkRequirement: 180, customerType: 'Wholesale', outstandingBalance: 8600, lastPaymentDate: new Date().toISOString() },
  { _id: 'c3', name: 'Amit Kumar', mobileNumber: '9123456782', address: 'DD Nagar, Gwalior', dailyMilkRequirement: 5, customerType: 'Retail', outstandingBalance: 450, lastPaymentDate: new Date().toISOString() },
  { _id: 'c4', name: 'Suresh Chandra', mobileNumber: '9123456783', address: 'Thatipur, Gwalior', dailyMilkRequirement: 3, customerType: 'Retail', outstandingBalance: 180, lastPaymentDate: new Date().toISOString() },
  { _id: 'c5', name: 'Ankita Food Court', mobileNumber: '9123456784', address: 'City Centre, Gwalior', dailyMilkRequirement: 120, customerType: 'Wholesale', outstandingBalance: 5800, lastPaymentDate: new Date().toISOString() }
];

let mockPurchases: any[] = [];
let mockSales: any[] = [];
let mockPayables: any[] = [];
let mockReceivables: any[] = [];
let mockExpenses = [
  { _id: 'e1', date: new Date().toISOString(), expenseType: 'Fuel', amount: 3500, description: 'Diesel for Tanker dispatch' },
  { _id: 'e2', date: new Date().toISOString(), expenseType: 'Salary', amount: 15000, description: 'Salary for driver Sunil' },
  { _id: 'e3', date: new Date().toISOString(), expenseType: 'Maintenance', amount: 1200, description: 'Tanker MP-07-G-1234 oil filter replacement' }
];

let mockTrucks = [
  { _id: 't1', truckNumber: 'MP-07-G-1234', capacity: 5000, driverName: 'Sunil Kumar', driverMobile: '9000012345', route: 'Gwalior-Dabra Route' },
  { _id: 't2', truckNumber: 'MP-07-G-5678', capacity: 3000, driverName: 'Vijay Yadav', driverMobile: '9000056789', route: 'Gwalior-Datia Route' }
];

let mockDispatches = [
  { _id: 'd1', dispatchDate: new Date().toISOString(), truckId: 't1', truckNumber: 'MP-07-G-1234', driverName: 'Sunil Kumar', route: 'Gwalior-Dabra Route', quantityLoaded: 4200, dispatchTime: '06:30 AM', arrivalTime: '11:15 AM' }
];

let mockPayments: any[] = [];
let mockReminders: any[] = [];
let mockBills: any[] = [];

// Initialize historic mock data
const initMockData = () => {
  if (mockPurchases.length > 0) return;

  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const tDate = new Date();
    tDate.setDate(now.getDate() - i);

    // Purchases
    mockSuppliers.forEach((s, idx) => {
      const quantity = 40 + idx * 5;
      const rate = 45;
      const totalAmount = quantity * rate;
      mockPurchases.push({
        _id: `p_${i}_${idx}`,
        purchaseDate: tDate.toISOString(),
        supplierId: s._id,
        supplierName: s.name,
        village: s.village,
        mobileNumber: s.mobileNumber,
        milkType: idx % 2 === 0 ? 'Cow' : 'Buffalo',
        quantity,
        fatPercentage: 4.2,
        snfPercentage: 8.5,
        ratePerLiter: rate,
        totalAmount,
        paymentStatus: i === 0 ? 'Unpaid' : 'Paid'
      });

      mockPayables.push({
        _id: `pay_${i}_${idx}`,
        supplierId: s._id,
        supplierName: s.name,
        amountPayable: totalAmount,
        dueDate: new Date(tDate.getTime() + 15*24*60*60*1000).toISOString(),
        paidAmount: i === 0 ? 0 : totalAmount,
        remainingAmount: i === 0 ? totalAmount : 0,
        status: i === 0 ? 'Unpaid' : 'Paid'
      });
    });

    // Sales
    mockCustomers.forEach((c, idx) => {
      const quantity = c.dailyMilkRequirement;
      const rate = c.customerType === 'Wholesale' ? 55 : 62;
      const totalAmount = quantity * rate;
      mockSales.push({
        _id: `s_${i}_${idx}`,
        saleDate: tDate.toISOString(),
        customerId: c._id,
        customerName: c.name,
        quantity,
        fatPercentage: 4.2,
        snfPercentage: 8.8,
        ratePerLiter: rate,
        totalAmount,
        paymentStatus: i === 0 ? 'Unpaid' : 'Paid'
      });

      mockReceivables.push({
        _id: `rec_${i}_${idx}`,
        customerId: c._id,
        customerName: c.name,
        customerMobile: c.mobileNumber,
        amountDue: totalAmount,
        dueDate: new Date(tDate.getTime() + 15*24*60*60*1000).toISOString(),
        paidAmount: i === 0 ? 0 : totalAmount,
        remainingAmount: i === 0 ? totalAmount : 0,
        status: i === 0 ? 'Unpaid' : 'Paid'
      });
    });
  }
};

const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'pitambara_doodh_dairy_secret_token_key_2026', {
    expiresIn: '30d',
  });
};

export const mockDbMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  // If database is disconnected (0), trigger a connection attempt
  if (mongoose.connection.readyState === 0) {
    try {
      let MONGODB_URI = process.env.MONGODB_URI;
      if (!MONGODB_URI || MONGODB_URI === 'undefined' || MONGODB_URI === 'null' || MONGODB_URI.trim() === '' || !MONGODB_URI.startsWith('mongodb')) {
        MONGODB_URI = 'mongodb+srv://pitambara_db_user:0kGvBaxijWWmYBCs@cluster0.gwpekfo.mongodb.net/pitambara_dms?appName=Cluster0';
      }
      const mongooseOptions = {
        autoIndex: true,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 15,
        minPoolSize: 2,
      };
      await mongoose.connect(MONGODB_URI, mongooseOptions);
    } catch (err) {
      console.error("Database connection failed inside middleware:", err);
    }
  }

  // If database is currently connecting, wait for it to finish
  if (mongoose.connection.readyState === 2) {
    try {
      await mongoose.connection;
    } catch (err) {
      // Ignore error; it is handled by connection readyState check below
    }
  }

  // If MongoDB is connected, skip mock database
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  // Initialize data stores
  initMockData();

  const url = req.path;
  const method = req.method;

  // Intercept Auth Login
  if (url === '/api/auth/login' && method === 'POST') {
    const { email, password } = req.body;
    const matchedUser = mockUsers.find(u => u.email === email);
    if (matchedUser && password && password.length >= 6) { // Demo allows any password >= 6 characters for user convenience
      return res.json({
        _id: matchedUser._id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role,
        token: generateToken(matchedUser._id)
      });
    }
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // Intercept Auth profile fetch
  if (url === '/api/auth/me' && method === 'GET') {
    // Return mock Admin details by default if JWT is validated or mock session
    return res.json(mockUsers[0]);
  }

  if (url === '/api/auth/users' && method === 'GET') {
    return res.json(mockUsers);
  }

  // Intercept Dashboard Stats
  if (url === '/api/dashboard/stats' && method === 'GET') {
    const today = new Date().toISOString().substring(0, 10);
    const todayPurch = mockPurchases.filter(p => p.purchaseDate.startsWith(today));
    const todaySales = mockSales.filter(s => s.saleDate.startsWith(today));

    // Daily Collection Trends (Last 7 Days)
    const trendDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().substring(0, 10);
    }).reverse();

    const collectionTrend = trendDates.map(date => {
      const qty = mockPurchases.filter(p => p.purchaseDate.startsWith(date)).reduce((sum, p) => sum + p.quantity, 0);
      return { _id: date, quantity: qty };
    });

    const distributionTrend = trendDates.map(date => {
      const qty = mockSales.filter(s => s.saleDate.startsWith(date)).reduce((sum, s) => sum + s.quantity, 0);
      return { _id: date, quantity: qty };
    });

    const totalExpenses = mockExpenses.reduce((sum, e) => sum + e.amount, 0);

    const duePaymentsCount = mockCustomers.filter(c => c.outstandingBalance > 0).length;
    const remindersSentToday = mockReminders.filter(r => {
      if (!r.sentAt) return false;
      return r.sentAt.substring(0, 10) === today;
    }).length;
    const overdueCustomerIds = mockReceivables.filter(r => r.status !== 'Paid' && new Date(r.dueDate) < new Date()).map(r => r.customerId);
    const overdueCustomerCount = Array.from(new Set(overdueCustomerIds)).length;

    return res.json({
      isDemoMode: true,
      todayPurchasedLiters: todayPurch.reduce((sum, p) => sum + p.quantity, 0) || 350,
      todaySoldLiters: todaySales.reduce((sum, s) => sum + s.quantity, 0) || 280,
      totalCustomers: mockCustomers.length,
      totalSuppliers: mockSuppliers.length,
      collectionTrend,
      distributionTrend,
      todayPurchasedCost: todayPurch.reduce((sum, p) => sum + p.totalAmount, 0) || 15750,
      todaySoldRevenue: todaySales.reduce((sum, s) => sum + s.totalAmount, 0) || 16800,
      totalReceivables: mockCustomers.reduce((sum, c) => sum + c.outstandingBalance, 0),
      totalPayables: mockSuppliers.reduce((sum, s) => sum + s.outstandingAmount, 0),
      monthlyExpenses: totalExpenses,
      mtdRevenue: 135000,
      mtdNetProfit: 45000,
      duePaymentsCount,
      remindersSentToday,
      overdueCustomerCount
    });
  }

  // Intercept Purchases
  if (url === '/api/purchases' && method === 'GET') {
    const { startDate, endDate, supplierId, village } = req.query;
    let filtered = [...mockPurchases];
    if (startDate) {
      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(p => new Date(p.purchaseDate) >= start);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => new Date(p.purchaseDate) <= end);
    }
    if (supplierId) {
      filtered = filtered.filter(p => p.supplierId === supplierId);
    }
    if (village) {
      const vLower = (village as string).toLowerCase();
      filtered = filtered.filter(p => p.village && p.village.toLowerCase().includes(vLower));
    }
    return res.json(filtered);
  }
  if (url === '/api/purchases/summary' && method === 'GET') {
    const dailyMap: { [date: string]: { totalQuantity: number; totalAmount: number; rateSum: number; count: number } } = {};
    const monthlyMap: { [month: string]: { totalQuantity: number; totalAmount: number; rateSum: number; count: number } } = {};

    mockPurchases.forEach(p => {
      const dateStr = p.purchaseDate.substring(0, 10);
      const monthStr = p.purchaseDate.substring(0, 7);

      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { totalQuantity: 0, totalAmount: 0, rateSum: 0, count: 0 };
      }
      dailyMap[dateStr].totalQuantity += p.quantity;
      dailyMap[dateStr].totalAmount += p.totalAmount;
      dailyMap[dateStr].rateSum += p.ratePerLiter;
      dailyMap[dateStr].count += 1;

      if (!monthlyMap[monthStr]) {
        monthlyMap[monthStr] = { totalQuantity: 0, totalAmount: 0, rateSum: 0, count: 0 };
      }
      monthlyMap[monthStr].totalQuantity += p.quantity;
      monthlyMap[monthStr].totalAmount += p.totalAmount;
      monthlyMap[monthStr].rateSum += p.ratePerLiter;
      monthlyMap[monthStr].count += 1;
    });

    const dailySummary = Object.keys(dailyMap).map(date => ({
      _id: date,
      totalQuantity: dailyMap[date].totalQuantity,
      totalAmount: dailyMap[date].totalAmount,
      averageRate: dailyMap[date].rateSum / dailyMap[date].count,
      count: dailyMap[date].count
    })).sort((a, b) => b._id.localeCompare(a._id)).slice(0, 30);

    const monthlySummary = Object.keys(monthlyMap).map(month => ({
      _id: month,
      totalQuantity: monthlyMap[month].totalQuantity,
      totalAmount: monthlyMap[month].totalAmount,
      averageRate: monthlyMap[month].rateSum / monthlyMap[month].count,
      count: monthlyMap[month].count
    })).sort((a, b) => b._id.localeCompare(a._id));

    return res.json({ dailySummary, monthlySummary });
  }
  if (url === '/api/purchases' && method === 'POST') {
    const { supplierId, quantity, ratePerLiter, milkType, purchaseDate } = req.body;
    const supplier = mockSuppliers.find(s => s._id === supplierId);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    const totalAmount = quantity * ratePerLiter;
    const newPurchase = {
      _id: `p_${Date.now()}`,
      purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : new Date().toISOString(),
      supplierId,
      supplierName: supplier.name,
      village: supplier.village,
      mobileNumber: supplier.mobileNumber,
      milkType,
      quantity,
      fatPercentage: 4.2,
      snfPercentage: 8.5,
      ratePerLiter,
      totalAmount,
      paymentStatus: 'Unpaid'
    };
    mockPurchases.unshift(newPurchase);

    // Update balances
    supplier.totalMilkSupplied += quantity;
    supplier.totalAmountPayable += totalAmount;
    supplier.outstandingAmount += totalAmount;

    mockPayables.push({
      _id: `pay_${Date.now()}`,
      supplierId,
      supplierName: supplier.name,
      amountPayable: totalAmount,
      dueDate: new Date(Date.now() + 15*24*60*60*1000).toISOString(),
      paidAmount: 0,
      remainingAmount: totalAmount,
      status: 'Unpaid'
    });

    return res.status(201).json(newPurchase);
  }
  if (url.startsWith('/api/purchases/') && method === 'DELETE') {
    const id = url.split('/').pop();
    mockPurchases = mockPurchases.filter(p => p._id !== id);
    return res.json({ message: 'Purchase deleted' });
  }

  // Intercept Sales
  if (url === '/api/sales' && method === 'GET') {
    const { startDate, endDate, customerId } = req.query;
    let filtered = [...mockSales];
    if (startDate) {
      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(s => new Date(s.saleDate) >= start);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => new Date(s.saleDate) <= end);
    }
    if (customerId) {
      filtered = filtered.filter(s => s.customerId === customerId);
    }
    return res.json(filtered);
  }
  if (url === '/api/sales' && method === 'POST') {
    const { customerId, quantity, ratePerLiter, saleDate } = req.body;
    const customer = mockCustomers.find(c => c._id === customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const totalAmount = quantity * ratePerLiter;
    const newSale = {
      _id: `s_${Date.now()}`,
      saleDate: saleDate ? new Date(saleDate).toISOString() : new Date().toISOString(),
      customerId,
      customerName: customer.name,
      quantity,
      fatPercentage: 4.2,
      snfPercentage: 8.8,
      ratePerLiter,
      totalAmount,
      paymentStatus: 'Unpaid'
    };
    mockSales.unshift(newSale);

    // Update customer balances
    customer.outstandingBalance += totalAmount;

    mockReceivables.push({
      _id: `rec_${Date.now()}`,
      customerId,
      customerName: customer.name,
      customerMobile: customer.mobileNumber,
      amountDue: totalAmount,
      dueDate: new Date(Date.now() + 15*24*60*60*1000).toISOString(),
      paidAmount: 0,
      remainingAmount: totalAmount,
      status: 'Unpaid'
    });

    return res.status(201).json(newSale);
  }
  if (url.startsWith('/api/sales/') && method === 'DELETE') {
    const id = url.split('/').pop();
    mockSales = mockSales.filter(s => s._id !== id);
    return res.json({ message: 'Sale deleted' });
  }

  // Intercept Suppliers
  if (url === '/api/suppliers' && method === 'GET') {
    return res.json(mockSuppliers);
  }
  if (url === '/api/suppliers' && method === 'POST') {
    const { name, village, mobileNumber } = req.body;
    const newSupp = { _id: `s_${Date.now()}`, name, village, mobileNumber, totalMilkSupplied: 0, totalAmountPayable: 0, outstandingAmount: 0 };
    mockSuppliers.push(newSupp);
    return res.status(201).json(newSupp);
  }
  if (url.startsWith('/api/suppliers/') && url.endsWith('/ledger')) {
    const id = url.split('/')[3];
    const supp = mockSuppliers.find(s => s._id === id);
    const purchases = mockPurchases.filter(p => p.supplierId === id);
    const payments = mockPayments.filter(p => p.supplierId === id);

    const ledger: any[] = [];
    purchases.forEach(p => ledger.push({ id: p._id, date: p.purchaseDate, type: 'Purchase', details: `${p.quantity}L of ${p.milkType}`, amount: p.totalAmount, direction: 'Credit' }));
    payments.forEach(p => ledger.push({ id: p._id, date: p.date, type: 'Payment', details: `Paid via ${p.paymentMethod}${p.referenceNumber ? ' (Ref: ' + p.referenceNumber + ')' : ''}`, amount: p.amount, direction: 'Debit' }));
    ledger.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const ledgerWithBalance = ledger.map(item => {
      runningBalance += item.direction === 'Credit' ? item.amount : -item.amount;
      return { ...item, runningBalance: Number(runningBalance.toFixed(2)) };
    });
    return res.json({ supplier: supp, ledger: ledgerWithBalance });
  }
  if (url.startsWith('/api/suppliers/') && method === 'DELETE') {
    const id = url.split('/').pop();
    mockSuppliers = mockSuppliers.filter(s => s._id !== id);
    return res.json({ message: 'Supplier deleted' });
  }

  // Intercept Customers
  if (url === '/api/customers' && method === 'GET') {
    return res.json(mockCustomers);
  }
  if (url === '/api/customers' && method === 'POST') {
    const { name, mobileNumber, address, dailyMilkRequirement, customerType } = req.body;
    const newCust = { _id: `c_${Date.now()}`, name, mobileNumber, address, dailyMilkRequirement, customerType, outstandingBalance: 0 };
    mockCustomers.push(newCust);
    return res.status(201).json(newCust);
  }
  if (url.startsWith('/api/customers/') && url.endsWith('/ledger')) {
    const id = url.split('/')[3];
    const cust = mockCustomers.find(c => c._id === id);
    const sales = mockSales.filter(s => s.customerId === id);
    const payments = mockPayments.filter(p => p.customerId === id);

    const ledger: any[] = [];
    sales.forEach(s => ledger.push({ id: s._id, date: s.saleDate, type: 'Sale', details: `${s.quantity}L delivered`, amount: s.totalAmount, direction: 'Debit' }));
    payments.forEach(p => ledger.push({ id: p._id, date: p.date, type: 'Payment', details: `Received via ${p.paymentMethod}${p.referenceNumber ? ' (Ref: ' + p.referenceNumber + ')' : ''}`, amount: p.amount, direction: 'Credit' }));
    ledger.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const ledgerWithBalance = ledger.map(item => {
      runningBalance += item.direction === 'Debit' ? item.amount : -item.amount;
      return { ...item, runningBalance: Number(runningBalance.toFixed(2)) };
    });
    return res.json({ customer: cust, ledger: ledgerWithBalance });
  }
  if (url.startsWith('/api/customers/') && method === 'DELETE') {
    const id = url.split('/').pop();
    mockCustomers = mockCustomers.filter(c => c._id !== id);
    return res.json({ message: 'Customer deleted' });
  }

  // Intercept Receivables
  if (url === '/api/receivables' && method === 'GET') {
    const { status } = req.query;
    return res.json(mockReceivables.filter(r => !status || r.status === status));
  }
  if (url.startsWith('/api/receivables/') && url.endsWith('/promised-date') && method === 'PUT') {
    const parts = url.split('/');
    const id = parts[3];
    const { promisedDate } = req.body;
    const rec = mockReceivables.find(r => r._id === id);
    if (!rec) return res.status(404).json({ message: 'Receivable not found' });

    rec.promisedDate = promisedDate ? new Date(promisedDate).toISOString() : undefined;
    return res.json(rec);
  }
  if (url.startsWith('/api/receivables/') && method === 'PUT' && !url.endsWith('/promised-date')) {
    const id = url.split('/').pop();
    const { amountDue, paidAmount, dueDate, promisedDate } = req.body;
    const rec = mockReceivables.find(r => r._id === id);
    if (!rec) return res.status(404).json({ message: 'Receivable not found' });

    const oldAmountDue = rec.amountDue;

    if (amountDue !== undefined) rec.amountDue = Number(amountDue);
    if (paidAmount !== undefined) rec.paidAmount = Number(paidAmount);
    if (dueDate !== undefined) rec.dueDate = new Date(dueDate).toISOString();
    if (promisedDate !== undefined) rec.promisedDate = promisedDate ? new Date(promisedDate).toISOString() : undefined;

    // Recalculate remainingAmount and status
    rec.remainingAmount = Number((rec.amountDue - rec.paidAmount).toFixed(2));
    if (rec.remainingAmount <= 0) {
      rec.status = 'Paid';
      rec.remainingAmount = 0;
    } else if (rec.paidAmount > 0) {
      rec.status = 'Partially Paid';
    } else {
      rec.status = 'Unpaid';
    }

    const diff = rec.amountDue - oldAmountDue;
    if (diff !== 0 && rec.customerId) {
      const customer = mockCustomers.find(c => c._id === rec.customerId);
      if (customer) {
        customer.outstandingBalance = Number((customer.outstandingBalance + diff).toFixed(2));
        
        // Recalculate FIFO allocations
        mockReceivables.forEach(r => {
          if (r.customerId === rec.customerId) {
            r.paidAmount = 0;
            r.remainingAmount = r.amountDue;
            r.status = 'Unpaid';
          }
        });
        const custPayments = mockPayments.filter(p => p.customerId === rec.customerId && p.type === 'Inflow').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        custPayments.forEach(pay => {
          let remainingPayment = pay.amount;
          const open = mockReceivables.filter(r => r.customerId === rec.customerId && r.status !== 'Paid').sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
          for (const r of open) {
            if (remainingPayment <= 0) break;
            const debt = r.remainingAmount;
            if (remainingPayment >= debt) {
              remainingPayment = Number((remainingPayment - debt).toFixed(2));
              r.paidAmount = Number((r.paidAmount + debt).toFixed(2));
              r.remainingAmount = 0;
              r.status = 'Paid';
            } else {
              r.paidAmount = Number((r.paidAmount + remainingPayment).toFixed(2));
              r.remainingAmount = Number((r.remainingAmount - remainingPayment).toFixed(2));
              r.status = 'Partially Paid';
              remainingPayment = 0;
            }
          }
        });
      }
    }

    return res.json(rec);
  }
  if (url.startsWith('/api/receivables/payments/') && method === 'PUT') {
    const id = url.split('/').pop();
    const { amount, paymentMethod, referenceNumber, date } = req.body;
    const payment = mockPayments.find(p => p._id === id);
    if (!payment) return res.status(404).json({ message: 'Payment record not found' });

    const oldAmount = payment.amount;
    const diff = amount - oldAmount;

    // Update payment
    payment.amount = amount !== undefined ? Number(amount) : payment.amount;
    payment.paymentMethod = paymentMethod || payment.paymentMethod;
    payment.referenceNumber = referenceNumber !== undefined ? referenceNumber : payment.referenceNumber;
    payment.date = date ? new Date(date).toISOString() : payment.date;

    // Adjust customer outstanding balance
    if (payment.customerId) {
      const customer = mockCustomers.find(c => c._id === payment.customerId);
      if (customer) {
        customer.outstandingBalance = Number((customer.outstandingBalance - diff).toFixed(2));
        
        // Recalculate FIFO allocations in mockReceivables
        // 1. Reset all receivables of this customer
        mockReceivables.forEach(r => {
          if (r.customerId === payment.customerId) {
            r.paidAmount = 0;
            r.remainingAmount = r.amountDue;
            r.status = 'Unpaid';
          }
        });

        // 2. Fetch all payments of this customer (Inflow) sorted by date ascending
        const custPayments = mockPayments.filter(p => p.customerId === payment.customerId && p.type === 'Inflow').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 3. Run FIFO
        custPayments.forEach(pay => {
          let remainingPayment = pay.amount;
          const open = mockReceivables.filter(r => r.customerId === payment.customerId && r.status !== 'Paid').sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
          for (const r of open) {
            if (remainingPayment <= 0) break;
            const debt = r.remainingAmount;
            if (remainingPayment >= debt) {
              remainingPayment = Number((remainingPayment - debt).toFixed(2));
              r.paidAmount = Number((r.paidAmount + debt).toFixed(2));
              r.remainingAmount = 0;
              r.status = 'Paid';
            } else {
              r.paidAmount = Number((r.paidAmount + remainingPayment).toFixed(2));
              r.remainingAmount = Number((r.remainingAmount - remainingPayment).toFixed(2));
              r.status = 'Partially Paid';
              remainingPayment = 0;
            }
          }
        });
      }
    }

    return res.json({ message: 'Payment updated successfully', payment });
  }
  if (url === '/api/receivables/payments' && method === 'POST') {
    const { customerId, amount, paymentMethod, referenceNumber } = req.body;
    const customer = mockCustomers.find(c => c._id === customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    customer.outstandingBalance = Number((customer.outstandingBalance - amount).toFixed(2));
    customer.lastPaymentDate = new Date().toISOString();

    const payment = { _id: `pay_${Date.now()}`, date: new Date().toISOString(), type: 'Inflow', customerId, amount, paymentMethod, referenceNumber };
    mockPayments.push(payment);

    let remaining = amount;
    const open = mockReceivables.filter(r => r.customerId === customerId && r.status !== 'Paid').sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    for (const r of open) {
      if (remaining <= 0) break;
      const debt = r.remainingAmount;
      if (remaining >= debt) {
        remaining -= debt;
        r.paidAmount += debt;
        r.remainingAmount = 0;
        r.status = 'Paid';
      } else {
        r.paidAmount += remaining;
        r.remainingAmount -= remaining;
        r.status = 'Partially Paid';
        remaining = 0;
      }
    }

    return res.status(201).json({ message: 'Payment recorded', payment, newOutstandingBalance: customer.outstandingBalance });
  }

  // Intercept Payables
  if (url === '/api/payables' && method === 'GET') {
    const { status } = req.query;
    return res.json(mockPayables.filter(p => !status || p.status === status));
  }
  if (url === '/api/payables/payments' && method === 'POST') {
    const { supplierId, amount, paymentMethod, referenceNumber } = req.body;
    const supplier = mockSuppliers.find(s => s._id === supplierId);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    supplier.outstandingAmount = Number((supplier.outstandingAmount - amount).toFixed(2));

    const payment = { _id: `pay_${Date.now()}`, date: new Date().toISOString(), type: 'Outflow', supplierId, amount, paymentMethod, referenceNumber };
    mockPayments.push(payment);

    let remaining = amount;
    const open = mockPayables.filter(p => p.supplierId === supplierId && p.status !== 'Paid').sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    for (const p of open) {
      if (remaining <= 0) break;
      const debt = p.remainingAmount;
      if (remaining >= debt) {
        remaining -= debt;
        p.paidAmount += debt;
        p.remainingAmount = 0;
        p.status = 'Paid';
      } else {
        p.paidAmount += remaining;
        p.remainingAmount -= remaining;
        p.status = 'Partially Paid';
        remaining = 0;
      }
    }

    return res.status(201).json({ message: 'Disbursement recorded', payment, newOutstandingAmount: supplier.outstandingAmount });
  }
  if (url.startsWith('/api/payables/payments/') && method === 'PUT') {
    const id = url.split('/').pop();
    const { amount, paymentMethod, referenceNumber, date } = req.body;
    const payment = mockPayments.find(p => p._id === id);
    if (!payment) return res.status(404).json({ message: 'Payment record not found' });

    const oldAmount = payment.amount;
    const diff = amount - oldAmount;

    // Update payment
    payment.amount = amount !== undefined ? Number(amount) : payment.amount;
    payment.paymentMethod = paymentMethod || payment.paymentMethod;
    payment.referenceNumber = referenceNumber !== undefined ? referenceNumber : payment.referenceNumber;
    payment.date = date ? new Date(date).toISOString() : payment.date;

    // Adjust supplier outstanding amount
    if (payment.supplierId) {
      const supplier = mockSuppliers.find(s => s._id === payment.supplierId);
      if (supplier) {
        supplier.outstandingAmount = Number((supplier.outstandingAmount - diff).toFixed(2));
        
        // Recalculate FIFO allocations in mockPayables
        // 1. Reset all payables of this supplier
        mockPayables.forEach(p => {
          if (p.supplierId === payment.supplierId) {
            p.paidAmount = 0;
            p.remainingAmount = p.amountPayable;
            p.status = 'Unpaid';
          }
        });

        // 2. Fetch all payments of this supplier (Outflow) sorted by date ascending
        const suppPayments = mockPayments.filter(p => p.supplierId === payment.supplierId && p.type === 'Outflow').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 3. Run FIFO
        suppPayments.forEach(pay => {
          let remainingPayment = pay.amount;
          const open = mockPayables.filter(p => p.supplierId === payment.supplierId && p.status !== 'Paid').sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
          for (const p of open) {
            if (remainingPayment <= 0) break;
            const debt = p.remainingAmount;
            if (remainingPayment >= debt) {
              remainingPayment = Number((remainingPayment - debt).toFixed(2));
              p.paidAmount = Number((p.paidAmount + debt).toFixed(2));
              p.remainingAmount = 0;
              p.status = 'Paid';
            } else {
              p.paidAmount = Number((p.paidAmount + remainingPayment).toFixed(2));
              p.remainingAmount = Number((p.remainingAmount - remainingPayment).toFixed(2));
              p.status = 'Partially Paid';
              remainingPayment = 0;
            }
          }
        });
      }
    }

    return res.json({ message: 'Payment updated successfully', payment });
  }

  // Intercept Logistics (Trucks & Dispatches)
  if (url === '/api/trucks' && method === 'GET') {
    return res.json(mockTrucks);
  }
  if (url === '/api/trucks' && method === 'POST') {
    const { truckNumber, capacity, driverName, driverMobile, route } = req.body;
    const newTruck = { _id: `t_${Date.now()}`, truckNumber, capacity, driverName, driverMobile, route };
    mockTrucks.push(newTruck);
    return res.status(201).json(newTruck);
  }
  if (url === '/api/dispatches' && method === 'GET') {
    const { startDate, endDate, truckId } = req.query;
    let filtered = [...mockDispatches];
    if (startDate) {
      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(d => new Date(d.dispatchDate) >= start);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(d => new Date(d.dispatchDate) <= end);
    }
    if (truckId) {
      filtered = filtered.filter(d => d.truckId === truckId);
    }
    return res.json(filtered);
  }
  if (url === '/api/dispatches' && method === 'POST') {
    const { truckId, quantityLoaded, dispatchTime, dispatchDate } = req.body;
    const truck = mockTrucks.find(t => t._id === truckId);
    if (!truck) return res.status(404).json({ message: 'Truck not found' });

    const newDisp = {
      _id: `d_${Date.now()}`,
      dispatchDate: dispatchDate ? new Date(dispatchDate).toISOString() : new Date().toISOString(),
      truckId,
      truckNumber: truck.truckNumber,
      driverName: truck.driverName,
      route: truck.route,
      quantityLoaded,
      dispatchTime,
      arrivalTime: ''
    };
    mockDispatches.unshift(newDisp);
    return res.status(201).json(newDisp);
  }
  if (url.startsWith('/api/dispatches/') && method === 'PUT') {
    const id = url.split('/').pop();
    const disp = mockDispatches.find(d => d._id === id);
    if (disp) {
      disp.arrivalTime = req.body.arrivalTime || disp.arrivalTime;
    }
    return res.json(disp);
  }
  if (url.startsWith('/api/dispatches/') && method === 'DELETE') {
    const id = url.split('/').pop();
    mockDispatches = mockDispatches.filter(d => d._id !== id);
    return res.json({ message: 'Dispatch log deleted' });
  }

  // Intercept Expenses
  if (url === '/api/expenses' && method === 'GET') {
    const { startDate, endDate, expenseType } = req.query;
    let filtered = [...mockExpenses];
    if (startDate) {
      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(e => new Date(e.date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e => new Date(e.date) <= end);
    }
    if (expenseType) {
      filtered = filtered.filter(e => e.expenseType === expenseType);
    }
    return res.json(filtered);
  }
  if (url === '/api/expenses' && method === 'POST') {
    const { expenseType, amount, description, date } = req.body;
    const newExp = {
      _id: `e_${Date.now()}`,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      expenseType,
      amount,
      description
    };
    mockExpenses.unshift(newExp);
    return res.status(201).json(newExp);
  }
  if (url === '/api/expenses/analysis' && method === 'GET') {
    const types = ['Fuel', 'Salary', 'Transport', 'Maintenance', 'Electricity', 'Miscellaneous'];
    const breakdown = types.map(t => {
      const sum = mockExpenses.filter(e => e.expenseType === t).reduce((acc, curr) => acc + curr.amount, 0);
      return { _id: t, totalAmount: sum };
    });
    return res.json({ breakdown, monthlyTrend: [] });
  }
  if (url.startsWith('/api/expenses/') && method === 'DELETE') {
    const id = url.split('/').pop();
    mockExpenses = mockExpenses.filter(e => e._id !== id);
    return res.json({ message: 'Expense deleted' });
  }

  // Intercept Profit & Loss Reports
  if (url === '/api/reports/pnl' && method === 'GET') {
    const { startDate, endDate } = req.query;
    let filteredSales = [...mockSales];
    let filteredPurchases = [...mockPurchases];
    let filteredExpenses = [...mockExpenses];

    if (startDate) {
      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      filteredSales = filteredSales.filter(s => new Date(s.saleDate) >= start);
      filteredPurchases = filteredPurchases.filter(p => new Date(p.purchaseDate) >= start);
      filteredExpenses = filteredExpenses.filter(e => new Date(e.date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      filteredSales = filteredSales.filter(s => new Date(s.saleDate) <= end);
      filteredPurchases = filteredPurchases.filter(p => new Date(p.purchaseDate) <= end);
      filteredExpenses = filteredExpenses.filter(e => new Date(e.date) <= end);
    }

    const revenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const purchaseCost = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const expenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    return res.json({
      startDate,
      endDate,
      revenue,
      purchaseCost,
      expenses,
      grossProfit: revenue - purchaseCost,
      netProfit: revenue - purchaseCost - expenses
    });
  }

  if (url.startsWith('/api/customers/') && url.endsWith('/remind') && method === 'POST') {
    const id = url.split('/')[3];
    const { reminderType } = req.body;
    const type = reminderType || 'WhatsApp';
    const cust = mockCustomers.find(c => c._id === id);
    if (!cust) return res.status(404).json({ message: 'Customer not found' });
    if (cust.outstandingBalance <= 0) return res.status(400).json({ message: 'Customer has no outstanding balance' });

    const message = `Dear ${cust.name},\n\nThis is a manual payment reminder from Pitambara Doodh Dairy.\n\nYour current outstanding balance is ₹${cust.outstandingBalance}. Please clear the payment at your earliest convenience.\n\nThank you.`;
    console.log(`[SIMULATED ${type.toUpperCase()} OUTBOUND (MOCK DB)] to: ${cust.mobileNumber}, body: "${message}"`);

    // Add to mockReminders
    const newReminder = {
      _id: `rem_${Date.now()}`,
      customerId: cust._id,
      customerName: cust.name,
      mobile: cust.mobileNumber,
      amount: cust.outstandingBalance,
      dueDate: new Date().toISOString(),
      reminderType: type,
      reminderStatus: 'Sent',
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    mockReminders.push(newReminder);

    // Update customer stats
    cust.lastReminderDate = new Date().toISOString();
    cust.totalRemindersSent = (cust.totalRemindersSent || 0) + 1;

    return res.json({ message: `${type} reminder sent successfully`, details: 'Simulated message logged to backend console.' });
  }

  if (url.startsWith('/api/customers/') && url.endsWith('/reminders') && method === 'GET') {
    const id = url.split('/')[3];
    const customerReminders = mockReminders.filter(r => r.customerId === id);
    return res.json(customerReminders);
  }

  if (url.startsWith('/api/receivables/') && url.endsWith('/remind') && method === 'POST') {
    const parts = url.split('/');
    const id = parts[3];
    const rec = mockReceivables.find(r => r._id === id);
    if (!rec) return res.status(404).json({ message: 'Receivable not found' });
    if (rec.remainingAmount <= 0) return res.status(400).json({ message: 'Receivable has no remaining dues' });

    const message = `Dear ${rec.customerName}, this is a reminder from PITAMBARA DOODH DAIRY. Your promised payment of ₹${rec.remainingAmount} was due/expected on ${rec.promisedDate ? new Date(rec.promisedDate).toLocaleDateString('en-IN') : new Date(rec.dueDate).toLocaleDateString('en-IN')}. Please arrange to clear this balance at your earliest convenience. Thank you!`;
    console.log(`[SIMULATED WHATSAPP OUTBOUND (MOCK DB)] to: ${rec.customerMobile}, body: "${message}"`);
    return res.json({ message: 'Reminder sent successfully', details: 'Simulated message logged to backend console.' });
  }

  // Intercept outstanding report
  if (url === '/api/reports/outstanding' && method === 'GET') {
    const outstandingList = mockCustomers.filter(c => c.outstandingBalance > 0).sort((a,b) => b.outstandingBalance - a.outstandingBalance);
    return res.json(outstandingList);
  }

  // Intercept overdue report
  if (url === '/api/reports/overdue' && method === 'GET') {
    const overdueList = mockReceivables.filter(r => r.status !== 'Paid' && new Date(r.dueDate) < new Date()).sort((a,b) => a.dueDate.localeCompare(b.dueDate));
    return res.json(overdueList);
  }

  // Intercept reminders report
  if (url === '/api/reports/reminders' && method === 'GET') {
    return res.json(mockReminders.sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
  }

  // Intercept PUT purchases (edit purchase)
  if (url.startsWith('/api/purchases/') && method === 'PUT') {
    const id = url.split('/').pop();
    const { purchaseDate, milkType, quantity, fatPercentage, snfPercentage, ratePerLiter, notes } = req.body;
    const purch = mockPurchases.find(p => p._id === id);
    if (!purch) return res.status(404).json({ message: 'Purchase not found' });

    const oldQty = purch.quantity;
    const oldAmount = purch.totalAmount;

    const qty = quantity !== undefined ? Number(quantity) : purch.quantity;
    const rate = ratePerLiter !== undefined ? Number(ratePerLiter) : purch.ratePerLiter;
    const newAmount = Number((qty * rate).toFixed(2));

    purch.purchaseDate = purchaseDate ? new Date(purchaseDate).toISOString() : purch.purchaseDate;
    purch.milkType = milkType || purch.milkType;
    purch.quantity = qty;
    purch.fatPercentage = fatPercentage !== undefined ? Number(fatPercentage) : purch.fatPercentage;
    purch.snfPercentage = snfPercentage !== undefined ? Number(snfPercentage) : purch.snfPercentage;
    purch.ratePerLiter = rate;
    purch.totalAmount = newAmount;
    purch.notes = notes !== undefined ? notes : purch.notes;

    // Adjust supplier aggregates
    const supplier = mockSuppliers.find(s => s._id === purch.supplierId);
    if (supplier) {
      supplier.totalMilkSupplied = Number((supplier.totalMilkSupplied - oldQty + qty).toFixed(2));
      supplier.totalAmountPayable = Number((supplier.totalAmountPayable - oldAmount + newAmount).toFixed(2));
      supplier.outstandingAmount = Number((supplier.outstandingAmount - oldAmount + newAmount).toFixed(2));
    }

    // Adjust payable
    const payable = mockPayables.find(p => p.supplierId === purch.supplierId && p.amountPayable === oldAmount);
    if (payable) {
      payable.amountPayable = newAmount;
      payable.remainingAmount = Number((newAmount - payable.paidAmount).toFixed(2));
      if (payable.remainingAmount <= 0) {
        payable.status = 'Paid';
        payable.remainingAmount = 0;
      } else if (payable.paidAmount > 0) {
        payable.status = 'Partially Paid';
      } else {
        payable.status = 'Unpaid';
      }
    }

    return res.json(purch);
  }

  // Intercept PUT sales (edit sale)
  if (url.startsWith('/api/sales/') && method === 'PUT') {
    const id = url.split('/').pop();
    const { saleDate, quantity, fatPercentage, snfPercentage, ratePerLiter } = req.body;
    const sale = mockSales.find(s => s._id === id);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    const oldAmount = sale.totalAmount;

    const qty = quantity !== undefined ? Number(quantity) : sale.quantity;
    const rate = ratePerLiter !== undefined ? Number(ratePerLiter) : sale.ratePerLiter;
    const newAmount = Number((qty * rate).toFixed(2));

    sale.saleDate = saleDate ? new Date(saleDate).toISOString() : sale.saleDate;
    sale.quantity = qty;
    sale.fatPercentage = fatPercentage !== undefined ? Number(fatPercentage) : sale.fatPercentage;
    sale.snfPercentage = snfPercentage !== undefined ? Number(snfPercentage) : sale.snfPercentage;
    sale.ratePerLiter = rate;
    sale.totalAmount = newAmount;

    // Adjust customer outstanding balance
    const customer = mockCustomers.find(c => c._id === sale.customerId);
    if (customer) {
      customer.outstandingBalance = Number((customer.outstandingBalance - oldAmount + newAmount).toFixed(2));
    }

    // Adjust receivable
    const receivable = mockReceivables.find(r => r.customerId === sale.customerId && r.amountDue === oldAmount);
    if (receivable) {
      receivable.amountDue = newAmount;
      receivable.remainingAmount = Number((newAmount - receivable.paidAmount).toFixed(2));
      if (receivable.remainingAmount <= 0) {
        receivable.status = 'Paid';
        receivable.remainingAmount = 0;
      } else if (receivable.paidAmount > 0) {
        receivable.status = 'Partially Paid';
      } else {
        receivable.status = 'Unpaid';
      }
    }

    return res.json(sale);
  }

  // Intercept PUT expenses (edit expense)
  if (url.startsWith('/api/expenses/') && method === 'PUT') {
    const id = url.split('/').pop();
    const { date, expenseType, amount, description } = req.body;
    const exp = mockExpenses.find(e => e._id === id);
    if (!exp) return res.status(404).json({ message: 'Expense not found' });

    exp.date = date ? new Date(date).toISOString() : exp.date;
    exp.expenseType = expenseType || exp.expenseType;
    exp.amount = amount !== undefined ? Number(amount) : exp.amount;
    exp.description = description !== undefined ? description : exp.description;

    return res.json(exp);
  }

  // Intercept PUT payables (edit payable)
  if (url.startsWith('/api/payables/') && method === 'PUT' && !url.includes('/payments/')) {
    const id = url.split('/').pop();
    const { amountPayable, paidAmount, dueDate } = req.body;
    const payable = mockPayables.find(p => p._id === id);
    if (!payable) return res.status(404).json({ message: 'Payable not found' });

    const oldAmountPayable = payable.amountPayable;

    if (amountPayable !== undefined) payable.amountPayable = Number(amountPayable);
    if (paidAmount !== undefined) payable.paidAmount = Number(paidAmount);
    if (dueDate !== undefined) payable.dueDate = new Date(dueDate).toISOString();

    payable.remainingAmount = Number((payable.amountPayable - payable.paidAmount).toFixed(2));
    if (payable.remainingAmount <= 0) {
      payable.status = 'Paid';
      payable.remainingAmount = 0;
    } else if (payable.paidAmount > 0) {
      payable.status = 'Partially Paid';
    } else {
      payable.status = 'Unpaid';
    }

    const diff = payable.amountPayable - oldAmountPayable;
    if (diff !== 0 && payable.supplierId) {
      const supplier = mockSuppliers.find(s => s._id === payable.supplierId);
      if (supplier) {
        supplier.outstandingAmount = Number((supplier.outstandingAmount + diff).toFixed(2));
        
        // Recalculate FIFO in mockPayables
        mockPayables.forEach(p => {
          if (p.supplierId === payable.supplierId) {
            p.paidAmount = 0;
            p.remainingAmount = p.amountPayable;
            p.status = 'Unpaid';
          }
        });
        const suppPayments = mockPayments.filter(p => p.supplierId === payable.supplierId && p.type === 'Outflow').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        suppPayments.forEach(pay => {
          let remainingPayment = pay.amount;
          const open = mockPayables.filter(p => p.supplierId === payable.supplierId && p.status !== 'Paid').sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
          for (const p of open) {
            if (remainingPayment <= 0) break;
            const debt = p.remainingAmount;
            if (remainingPayment >= debt) {
              remainingPayment = Number((remainingPayment - debt).toFixed(2));
              p.paidAmount = Number((p.paidAmount + debt).toFixed(2));
              p.remainingAmount = 0;
              p.status = 'Paid';
            } else {
              p.paidAmount = Number((p.paidAmount + remainingPayment).toFixed(2));
              p.remainingAmount = Number((p.remainingAmount - remainingPayment).toFixed(2));
              p.status = 'Partially Paid';
              remainingPayment = 0;
            }
          }
        });
      }
    }

    return res.json(payable);
  }

  // Intercept GET Bills list
  if (url === '/api/bills' && method === 'GET') {
    const { customerId, status } = req.query;
    let list = [...mockBills];
    if (customerId) list = list.filter(b => b.customerId === customerId);
    if (status) list = list.filter(b => b.status === status);
    return res.json(list.sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime()));
  }

  // Intercept GET Bill by ID
  if (url.startsWith('/api/bills/') && method === 'GET' && !url.endsWith('/send')) {
    const id = url.split('/').pop();
    const bill = mockBills.find(b => b._id === id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    return res.json(bill);
  }

  // Intercept POST Create Bill
  if (url === '/api/bills' && method === 'POST') {
    const { customerId, billDate, dueDate, items, discount, tax, paidAmount, businessName, businessAddress, businessPhone } = req.body;
    const customer = mockCustomers.find(c => c._id === customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const billId = 'b' + (mockBills.length + 1);
    const billNumber = `PND-${new Date(billDate || Date.now()).getFullYear()}-${String(mockBills.length + 1).padStart(4, '0')}`;

    let subtotal = 0;
    const computedItems = (items || []).map((item: any, idx: number) => {
      const amount = Number((item.quantity * item.rate).toFixed(2));
      subtotal += amount;
      return { ...item, _id: 'bi_' + idx, amount };
    });

    const discVal = Number(discount || 0);
    const taxVal = Number(tax || 0);
    const totalAmount = Number((subtotal + taxVal - discVal).toFixed(2));
    const paidVal = Number(paidAmount || 0);
    const remainingAmount = Number((totalAmount - paidVal).toFixed(2));
    const status = remainingAmount <= 0 ? 'Paid' : (paidVal > 0 ? 'Partially Paid' : 'Unpaid');

    const newBill = {
      _id: billId,
      billNumber,
      customerId,
      customerName: customer.name,
      customerMobile: customer.mobileNumber,
      billDate: billDate || new Date().toISOString(),
      dueDate: dueDate || new Date().toISOString(),
      items: computedItems,
      subtotal,
      discount: discVal,
      tax: taxVal,
      totalAmount,
      paidAmount: paidVal,
      remainingAmount,
      status,
      businessName: businessName || 'Pitambara Doodh Dairy',
      businessAddress: businessAddress || 'Devpura, Jaitpur Kala, District Agra, Pincode 283114',
      businessPhone: businessPhone || 'Vandana Purohit - 7668459330, Deelip Purohit - 7817873319',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockBills.push(newBill);

    // Update customer outstanding
    customer.outstandingBalance = Number((customer.outstandingBalance + remainingAmount).toFixed(2));

    // Create mock Receivable
    if (remainingAmount > 0) {
      mockReceivables.push({
        _id: 'rec_bill_' + billId,
        customerId: customer._id,
        customerName: customer.name,
        customerMobile: customer.mobileNumber,
        amountDue: totalAmount,
        paidAmount: paidVal,
        remainingAmount,
        dueDate: dueDate || new Date().toISOString(),
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return res.status(201).json(newBill);
  }

  // Intercept PUT Update Bill
  if (url.startsWith('/api/bills/') && method === 'PUT') {
    const id = url.split('/').pop();
    const billIdx = mockBills.findIndex(b => b._id === id);
    if (billIdx === -1) return res.status(404).json({ message: 'Bill not found' });

    const bill = mockBills[billIdx];
    const customer = mockCustomers.find(c => c._id === bill.customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const { items, discount, tax, paidAmount, dueDate } = req.body;
    const oldRemaining = bill.remainingAmount;

    if (items) {
      let subtotal = 0;
      bill.items = items.map((item: any, idx: number) => {
        const amount = Number((item.quantity * item.rate).toFixed(2));
        subtotal += amount;
        return { ...item, _id: 'bi_u_' + idx, amount };
      });
      bill.subtotal = subtotal;
    }

    if (discount !== undefined) bill.discount = Number(discount);
    if (tax !== undefined) bill.tax = Number(tax);
    if (paidAmount !== undefined) bill.paidAmount = Number(paidAmount);
    if (dueDate) bill.dueDate = dueDate;

    bill.totalAmount = Number((bill.subtotal + bill.tax - bill.discount).toFixed(2));
    bill.remainingAmount = Number((bill.totalAmount - bill.paidAmount).toFixed(2));
    bill.status = bill.remainingAmount <= 0 ? 'Paid' : (bill.paidAmount > 0 ? 'Partially Paid' : 'Unpaid');
    bill.updatedAt = new Date().toISOString();

    // Update customer balance
    const remainingDiff = bill.remainingAmount - oldRemaining;
    customer.outstandingBalance = Number((customer.outstandingBalance + remainingDiff).toFixed(2));

    // Update Receivable
    const recIdx = mockReceivables.findIndex(r => r.customerId === bill.customerId && r.dueDate === bill.dueDate);
    if (recIdx !== -1) {
      mockReceivables[recIdx].amountDue = bill.totalAmount;
      mockReceivables[recIdx].paidAmount = bill.paidAmount;
      mockReceivables[recIdx].remainingAmount = bill.remainingAmount;
      mockReceivables[recIdx].status = bill.status;
    }

    return res.json(bill);
  }

  // Intercept DELETE Bill
  if (url.startsWith('/api/bills/') && method === 'DELETE') {
    const id = url.split('/').pop();
    const billIdx = mockBills.findIndex(b => b._id === id);
    if (billIdx === -1) return res.status(404).json({ message: 'Bill not found' });

    const bill = mockBills[billIdx];
    const customer = mockCustomers.find(c => c._id === bill.customerId);
    if (customer) {
      customer.outstandingBalance = Number((customer.outstandingBalance - bill.remainingAmount).toFixed(2));
    }

    // Delete Receivable
    mockReceivables = mockReceivables.filter(r => !(r.customerId === bill.customerId && r.dueDate === bill.dueDate));

    // Delete bill
    mockBills.splice(billIdx, 1);

    return res.json({ message: 'Bill invoice deleted successfully' });
  }

  // Intercept POST Send Bill Notification
  if (url.startsWith('/api/bills/') && url.endsWith('/send') && method === 'POST') {
    const parts = url.split('/');
    const id = parts[parts.length - 2];
    const { type } = req.body;

    const bill = mockBills.find(b => b._id === id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    const customer = mockCustomers.find(c => c._id === bill.customerId);
    if (customer) {
      customer.lastReminderDate = new Date().toISOString();
      customer.totalRemindersSent = (customer.totalRemindersSent || 0) + 1;
    }

    console.log(`[SIMULATED ${type.toUpperCase()} BILL NOTIFICATION] To: ${bill.customerMobile}, Message: "Dear ${bill.customerName}, your invoice ${bill.billNumber} from ${bill.businessName} has been generated..."`);

    return res.json({ message: `Bill sent successfully via ${type}`, details: 'Simulated dispatch logged' });
  }

  // Route not handled by mock DB interceptor
  return res.status(501).json({ message: 'Database fallback route not implemented' });
};
